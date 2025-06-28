import 'dart:html';
import 'dart:convert';
import 'dart:math';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'dart:async';

const LOCAL_EDITION_URL_KEY = "le";
const EXTERNAL_EDITION_URL_KEY = "edition";
const FULL_TEXT_URL_KEY = "fulltext";
var bylineStyler = BylineStyler();

// Dark mode management
class DarkModeManager {
  static const String _darkModeKey = 'darkMode';
  static const String _moonEmoji = '🌙';
  static const String _sunEmoji = '☀️';
  
  late ButtonElement _toggleButton;
  late Element _body;
  
  DarkModeManager() {
    _body = document.body!;
    _createToggleButton();
    _initializeDarkMode();
  }
  
  void _createToggleButton() {
    _toggleButton = ButtonElement()
      ..className = 'dark-mode-toggle'
      ..text = _moonEmoji
      ..onClick.listen((_) => toggleDarkMode());
    
    document.body!.append(_toggleButton);
  }
  
  void _initializeDarkMode() {
    final savedMode = window.localStorage[_darkModeKey];
    final prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode == 'true' || (savedMode == null && prefersDark)) {
      _body.classes.add('dark-mode');
      _toggleButton.text = _sunEmoji;
    }
  }
  
  void toggleDarkMode() {
    if (_body.classes.contains('dark-mode')) {
      _body.classes.remove('dark-mode');
      _toggleButton.text = _moonEmoji;
      window.localStorage[_darkModeKey] = 'false';
    } else {
      _body.classes.add('dark-mode');
      _toggleButton.text = _sunEmoji;
      window.localStorage[_darkModeKey] = 'true';
    }
  }
}

// Generate permalink URL for a specific date
String generatePermalink(DateTime date) {
  var dateFormatted = DateFormat('yyyyMMdd').format(date);
  var currentUri = Uri.base;
  var queryParams = Map<String, String>.from(currentUri.queryParameters);
  queryParams[EXTERNAL_EDITION_URL_KEY] = dateFormatted;
  // Remove other edition-related parameters to avoid conflicts
  queryParams.remove(LOCAL_EDITION_URL_KEY);

  return Uri(
    scheme: currentUri.scheme,
    host: currentUri.host,
    port: currentUri.port,
    path: currentUri.path,
    queryParameters: queryParams,
  ).toString();
}

// Copy text to clipboard
Future<void> copyToClipboard(String text) async {
  try {
    await window.navigator.clipboard?.writeText(text);
    print('Permalink copied to clipboard: $text');
  } catch (e) {
    print('Failed to copy to clipboard: $e');
  }
}

// Create clickable date element
Element createDateLink(DateTime date) {
  var dateFormatted = DateFormat.yMMMMEEEEd().format(date);
  var permalink = generatePermalink(date);

  var dateLink = AnchorElement()
    ..href = '#'
    ..text = dateFormatted
    ..style.cursor = 'pointer'
    ..style.textDecoration = 'underline'
    ..style.color = 'inherit';

  dateLink.onClick.listen((event) {
    event.preventDefault();
    copyToClipboard(permalink);

    // Visual feedback
    var originalText = dateLink.text;
    dateLink.text = 'Copied!';
    dateLink.style.color = '#4CAF50';

    Timer(Duration(seconds: 2), () {
      dateLink.text = originalText;
      dateLink.style.color = 'inherit';
    });
  });

  return dateLink;
}

// todo: fix weather box
void main() async {
  print("Fetching Gazette");

  // Initialize dark mode manager
  final darkModeManager = DarkModeManager();

  DivElement subheadElement = querySelector('.subhead') as DivElement;
  // Set initial date as a clickable link
  var initialDate = DateTime(2021, 2, 2);
  var dateLink = createDateLink(initialDate);
  subheadElement.children.clear();
  subheadElement.append(dateLink);

  DivElement articlesElement = querySelector('#articles') as DivElement;
  bool fullText = Uri.base.queryParameters.containsKey(FULL_TEXT_URL_KEY);

  if (Uri.base.queryParameters.containsKey(LOCAL_EDITION_URL_KEY)) {
    var notebookName = Uri.base.queryParameters[LOCAL_EDITION_URL_KEY]!;
    var source = Uri.http('localhost:8080', 'gazettes/${notebookName}.json');
    loadGazette(source, subheadElement, articlesElement, fullText);
  } else if (Uri.base.queryParameters.containsKey(EXTERNAL_EDITION_URL_KEY)) {
    var editionName = Uri.base.queryParameters[EXTERNAL_EDITION_URL_KEY]!;
    var source =
        Uri.https('raw.githubusercontent.com', '/jasonrdsouza/gazette/refs/heads/main/editions/${editionName}.json');
    loadGazette(source, subheadElement, articlesElement, fullText);
  } else {
    print("Loading yesterday's gazette");
    var yesterday = DateTime.now().subtract(Duration(days: 1));
    var yesterdayFormatted = DateFormat('yyyyMMdd').format(yesterday);
    var source = Uri.https('raw.githubusercontent.com', '/jasonrdsouza/gazette/refs/heads/main/editions/${yesterdayFormatted}.json');
    loadGazette(source, subheadElement, articlesElement, fullText);
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

DivElement constructArticleElement(Article Article, bool fullText) {
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

  ParagraphElement articleContents = new ParagraphElement();
  if (fullText) {
    articleContents.setInnerHtml(Article.content.join("\n"), validator: validator);
  } else {
    articleContents.setInnerHtml(Article.summary, validator: validator);
  }
  columnDiv.append(articleContents);

  AnchorElement headlineLink = new AnchorElement();
  headlineLink.href = Article.link.toString();
  headlineLink.text = "(Link to full article)";
  columnDiv.append(headlineLink);

  return columnDiv;
}

Future loadGazette(Uri source, DivElement subheadElement, DivElement articlesElement, bool fullText) async {
  var response = await http.get(source);
  if (response.statusCode == 200) {
    var data = jsonDecode(response.body);
    var edition = Edition.fromJson(data);

    // Clear existing content and add the date link
    subheadElement.children.clear();
    var dateLink = createDateLink(edition.publishDate);
    subheadElement.append(dateLink);

    SpanElement articleCountDiv = new SpanElement();
    articleCountDiv.classes.add("articlecount");
    articleCountDiv.text = "${edition.articles.length} articles";
    subheadElement.append(articleCountDiv);

    SpanElement lookbackDiv = new SpanElement();
    lookbackDiv.classes.add("lookback");
    lookbackDiv.text = "${edition.lookbackDays} days lookback";
    subheadElement.append(lookbackDiv);

    articlesElement.children.clear();
    for (var article in edition.articles) {
      var articleElement = constructArticleElement(article, fullText);
      articlesElement.append(articleElement);
    }

    print('Gazette successfully loaded from ${source}');
  } else {
    print("Couldn't load gazette from ${source}");
  }
}
