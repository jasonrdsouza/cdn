import 'dart:async';
import 'dart:convert';
import 'dart:html';
import 'dart:math';

import 'highlight.dart';

const CACHE_WAIT_MILLISECONDS = 500;
const READER_WORDS_PER_MINUTE = 200;
const VIEWER_QUERY_PARAM = 'v';
const SCRIBE_URL = "https://us-central1-dsouza-proving-ground.cloudfunctions.net/scribe";
//const SCRIBE_URL = "http://localhost:8081";

void main() async {
  print('Article Scribe Awoken!');

  FormElement urlForm = querySelector('#urlForm') as FormElement;
  ButtonElement submitButton = querySelector('#submit') as ButtonElement;
  InputElement urlInput = querySelector('#sourceUrl') as InputElement;
  HeadingElement articleMetrics = querySelector('#articleMetrics') as HeadingElement;
  AnchorElement rawContentLink = querySelector('#rawContentLink') as AnchorElement;
  AnchorElement articleLink = querySelector('#articleLink') as AnchorElement;
  DivElement articleContents = querySelector('#articleContents') as DivElement;
  DivElement loadingIcon = querySelector('.loadingIcon') as DivElement;
  DivElement errorScreen = querySelector('.errorScreen') as DivElement;
  ProgressElement readingProgressBar = querySelector('#readingProgress') as ProgressElement;

  urlForm.onSubmit.listen((Event e) {
    e.preventDefault(); // prevent page from reloading
    clearArticleContents(articleContents);
    clearText(articleMetrics);
    clearText(articleLink);
    clearText(rawContentLink);
    hideElement(errorScreen);
    showElement(loadingIcon);

    var url = standardizeUrl(urlInput.value);
    setShareableUrl(url);

    var body = {'page': url};
    var headers = {'Content-Type': 'application/json'};
    HttpRequest.request('${SCRIBE_URL}/simplify', method: 'POST', requestHeaders: headers, sendData: json.encode(body))
        .then((HttpRequest resp) {
      var readableResult = json.decode(resp.responseText!);
      articleLink.text = readableResult['title'];
      articleLink.href = url;
      populateRawContentLink(rawContentLink, SCRIBE_URL, url);
      articleMetrics.text = produceMetricText(readableResult['textContent']);
      transcribeArticleContents(articleContents, readableResult['content']);

      hideElement(loadingIcon);
      findAndHighlightCodeBlocks();
    }).catchError((error) {
      articleLink.text = "Error transcribing article...";
      articleLink.href = url;
      hideElement(loadingIcon);
      showElement(errorScreen);
    });
  });

  // trigger cached article check
  var timer = Timer(Duration(milliseconds: CACHE_WAIT_MILLISECONDS),
      () => setCachedStatus(SCRIBE_URL, standardizeUrl(urlInput.value), submitButton));
  urlInput.onInput.listen((Event e) {
    clearCachedStatus(submitButton);
    timer.cancel();
    timer = Timer(Duration(milliseconds: CACHE_WAIT_MILLISECONDS),
        () => setCachedStatus(SCRIBE_URL, standardizeUrl(urlInput.value), submitButton));
  });

  fetchInitialUrl(urlInput, submitButton);
  hideSearchBarIfRequested();

  // update read progress indicator
  window.onScroll.listen((_) {
    readingProgressBar.value = calculatePercentDone(articleContents);
  });
}

class AllowAllUriPolicy implements UriPolicy {
  @override
  bool allowsUri(String uri) {
    return true;
  }
}

clearCachedStatus(Element submitButton) {
  submitButton.classes.remove('cached');
  submitButton.classes.remove('uncached');
}

setCachedStatus(String baseScribeUrl, String requestUrl, Element element) {
  if (['https://', 'http://'].contains(requestUrl)) {
    // don't check cache for empty request URL
    clearCachedStatus(element);
    return;
  }

  String encodedUrl = Uri.encodeQueryComponent(requestUrl);
  HttpRequest.getString('${baseScribeUrl}/cached?url=${encodedUrl}').then((result) {
    var isCached = result == 'true';

    if (isCached) {
      element.classes.remove('uncached');
      element.classes.add('cached');
    } else {
      element.classes.remove('cached');
      element.classes.add('uncached');
    }
  });
}

hideElement(DivElement div) {
  div.style.display = 'none';
}

showElement(DivElement div) {
  div.style.display = 'block';
}

clearText(HtmlElement element) {
  element.text = "";
}

populateRawContentLink(AnchorElement link, String baseScribeUrl, String requestUrl) {
  link.text = "SEE RAW CONTENT";
  String encodedUrl = Uri.encodeQueryComponent(requestUrl);
  link.href = '${baseScribeUrl}/fetch?url=${encodedUrl}';
}

clearArticleContents(DivElement articleDiv) {
  articleDiv.setInnerHtml("");
}

transcribeArticleContents(DivElement articleDiv, String articleContents) {
  UriPolicy allowAllUris = AllowAllUriPolicy();
  NodeValidator validator = NodeValidatorBuilder.common()
    ..allowTextElements()
    ..allowNavigation(allowAllUris)
    ..allowImages(allowAllUris)
    ..allowSvg();

  articleDiv.setInnerHtml(articleContents, validator: validator);
}

fetchInitialUrl(InputElement urlInput, ButtonElement submitButton) {
  String key = 'url';
  if (Uri.base.queryParameters.containsKey(key)) {
    urlInput.value = standardizeUrl(Uri.base.queryParameters[key]);
    submitButton.click();
  }
}

hideSearchBarIfRequested() {
  if (Uri.base.queryParameters.containsKey(VIEWER_QUERY_PARAM) && Uri.base.queryParameters[VIEWER_QUERY_PARAM] == '1') {
    hideElement(querySelector('#formWrapper') as DivElement);
  }
}

setShareableUrl(String url) {
  String queryString = 'url=${url}';
  if (Uri.base.queryParameters.containsKey(VIEWER_QUERY_PARAM)) {
    queryString = 'v=1&${queryString}';
  }
  window.history.replaceState('', 'Article Reader', '?${queryString}');
}

String standardizeUrl(String? url) {
  if (url == null) {
    return "";
  } else {
    Uri initialUrl = Uri.parse(url.trim());
    if (initialUrl.hasScheme) {
      return initialUrl.toString();
    } else {
      return 'https://${initialUrl}';
    }
  }
}

int countWords(String articleContents) {
  return articleContents.split(new RegExp(r'\s+')).length;
}

double calculateReadTime(int numWords) {
  return numWords / READER_WORDS_PER_MINUTE;
}

String produceMetricText(String articleContents) {
  int numWords = countWords(articleContents);
  int readTimeMins = calculateReadTime(numWords).round();
  return '(${readTimeMins} minute read | ${numWords} words)';
}

int calculatePercentDone(DivElement article) {
  int viewportHeight = window.innerHeight!;
  int articleHeight = article.offsetHeight;
  int scrolledHeight = window.scrollY;
  double scrolledPercentage = ((viewportHeight + scrolledHeight) / articleHeight) * 100;
  print('${scrolledPercentage}% done with the article');
  return min(scrolledPercentage.round(), 100);
}
