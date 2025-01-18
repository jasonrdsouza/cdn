import 'dart:html';
import 'dart:convert';
import 'dart:math';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;

const LOCAL_EDITION_URL_KEY = "le";
const EXTERNAL_EDITION_URL_KEY = "edition";
var bylineStyler = BylineStyler();

// todo: fix weather box
void main() async {
  print("Fetching Gazette");

  DivElement subheadElement = querySelector('.subhead') as DivElement;
  subheadElement.text = DateFormat.yMMMMEEEEd().format(DateTime(2021, 2, 2));
  DivElement articlesElement = querySelector('#articles') as DivElement;

  if (Uri.base.queryParameters.containsKey(LOCAL_EDITION_URL_KEY)) {
    var notebookName = Uri.base.queryParameters[LOCAL_EDITION_URL_KEY]!;
    var source = Uri.http('localhost:8080', 'gazettes/${notebookName}.json');
    loadGazette(source, subheadElement, articlesElement);
  } else if (Uri.base.queryParameters.containsKey(EXTERNAL_EDITION_URL_KEY)) {
    var editionName = Uri.base.queryParameters[EXTERNAL_EDITION_URL_KEY]!;
    var source =
        Uri.https('raw.githubusercontent.com', '/jasonrdsouza/gazette/refs/heads/main/editions/${editionName}.json');
    loadGazette(source, subheadElement, articlesElement);
  } else {
    // todo: load gazette with today's content?
    print("No Gazette loaded.");
  }
}

class Edition {
  Edition({required this.publishDate, required this.lookbackDays, required this.articles});

  final DateTime publishDate;
  final int lookbackDays;
  final List<Article> articles;

  factory Edition.fromJson(Map<String, dynamic> data) {
    final publishDate = DateTime.parse(data['publishDate'] as String);
    final lookbackDays = data['lookbackDays'] as int;
    final dynamicArticles = data['articles'] as List<dynamic>;
    final articles = dynamicArticles.map((dynamicArticle) => Article.fromJson(dynamicArticle)).toList();

    return Edition(publishDate: publishDate, lookbackDays: lookbackDays, articles: articles);
  }
}

class Article {
  Article(
      {required this.source,
      required this.title,
      required this.link,
      required this.publishedAt,
      required this.summary,
      required this.content});

  final String source;
  final String title;
  final Uri link;
  final DateTime publishedAt;
  final String summary;
  List<String> content;

  factory Article.fromJson(Map<String, dynamic> data) {
    final source = data['source'] as String;
    final title = data['title'] as String;
    final link = Uri.parse(data['link'] as String);
    final publishedAt = DateTime.parse(data['publishedAt'] as String);
    final summary = data['summary'] as String;
    final dynamicContent = data['content'] as List<dynamic>;
    final content = dynamicContent.map((dynamicContent) => dynamicContent as String).toList();

    return Article(
        source: source, title: title, link: link, publishedAt: publishedAt, summary: summary, content: content);
  }
}

class AllowAllUriPolicy implements UriPolicy {
  @override
  bool allowsUri(String uri) {
    return true;
  }
}

// todo: choose headline style based on title length
String randomHeadlineStyle() {
  final HEADLINE_STYLES = <String>["hl1", "hl2", "hl3"];
  return HEADLINE_STYLES[new Random().nextInt(HEADLINE_STYLES.length)];
}

class BylineStyler {
  final BYLINE_STYLES = <String>["bl1", "bl2", "bl3"];
  Map<String, String> assignedStyles;

  BylineStyler() : assignedStyles = Map<String, String>();

  String chooseStyle(String source) {
    if (assignedStyles.containsKey(source)) {
      return assignedStyles[source]!;
    }

    String style = BYLINE_STYLES[new Random().nextInt(BYLINE_STYLES.length)];
    assignedStyles[source] = style;
    return style;
  }
}

DivElement constructArticleElement(Article) {
  DivElement columnDiv = new DivElement();
  columnDiv.classes.add("collumn");

  DivElement headDiv = new DivElement();
  headDiv.classes.add("head");
  columnDiv.append(headDiv);

  SpanElement headlineSpan = new SpanElement();
  headlineSpan.classes.add("headline");
  headlineSpan.classes.add(randomHeadlineStyle());
  headlineSpan.text = Article.title;
  headDiv.append(headlineSpan);

  SpanElement authorSpan = new SpanElement();
  authorSpan.classes.add("headline");
  authorSpan.classes.add(bylineStyler.chooseStyle(Article.source));
  authorSpan.text = Article.source;
  headDiv.append(authorSpan);

  UriPolicy allowAllUris = AllowAllUriPolicy();
  NodeValidator validator = NodeValidatorBuilder.common()
    ..allowTextElements()
    ..allowNavigation(allowAllUris)
    ..allowImages(allowAllUris)
    ..allowSvg()
    ..allowHtml5();

  ParagraphElement articleSummary = new ParagraphElement();
  articleSummary.setInnerHtml(Article.summary, validator: validator);
  columnDiv.append(articleSummary);

  AnchorElement headlineLink = new AnchorElement();
  headlineLink.href = Article.link.toString();
  headlineLink.text = "(Link to full article)";
  columnDiv.append(headlineLink);

  return columnDiv;
}

Future loadGazette(Uri source, DivElement subheadElement, DivElement articlesElement) async {
  var response = await http.get(source);
  if (response.statusCode == 200) {
    var data = jsonDecode(response.body);
    var edition = Edition.fromJson(data);

    subheadElement.text = DateFormat.yMMMMEEEEd().format(edition.publishDate);
    SpanElement lookbackDiv = new SpanElement();
    lookbackDiv.classes.add("lookback");
    lookbackDiv.text = "${edition.lookbackDays} days lookback";
    subheadElement.append(lookbackDiv);

    articlesElement.children.clear();
    for (var article in edition.articles) {
      var articleElement = constructArticleElement(article);
      articlesElement.append(articleElement);
    }

    print('Gazette successfully loaded from ${source}');
  } else {
    subheadElement.text = DateFormat.yMMMMEEEEd().format(DateTime.now());
    articlesElement.text = "Couldn't load gazette from ${source}";
    print("Couldn't load gazette from ${source}");
  }
}
