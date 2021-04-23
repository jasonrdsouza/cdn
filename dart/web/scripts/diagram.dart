import 'dart:html';
import 'dart:svg';
import 'dart:convert';
import 'mermaidApi.dart';

const SHAREABLE_URL_KEY = "graph";

void main() {
  print("Diagrammer Active.");

  ButtonElement submitButton = querySelector('#submitFormat') as ButtonElement;
  TextAreaElement inputElement = querySelector('#input') as TextAreaElement;
  HtmlElement outputBlock = querySelector('#output') as HtmlElement;

  NodeValidator unsafeValidator = new UnsafeValidator();

  submitButton.onClick.listen((_) {
    var input = inputElement.value;
    if (input != null) {
      var diagram = SvgElement.svg(render("tempId", input), validator: unsafeValidator);
      outputBlock.children
        ..clear()
        ..add(diagram);
      setShareableUrlSlug(encodeDiagramGraph(input));
    }
  });

  populateGraphFromSlug(inputElement, submitButton);
}

class UnsafeValidator implements NodeValidator {
  @override
  bool allowsAttribute(Element element, String attributeName, String value) {
    return true;
  }

  @override
  bool allowsElement(Element element) {
    return true;
  }
}

String encodeDiagramGraph(String graph) {
  var bytes = utf8.encode(graph);
  return base64Url.encode(bytes);
}

String decodeDiagramGraph(String encodedGraph) {
  var bytes = base64Url.decode(encodedGraph);
  return utf8.decode(bytes);
}

void setShareableUrlSlug(String slug) {
  window.history.replaceState('', '', '?${SHAREABLE_URL_KEY}=${slug}');
}

populateGraphFromSlug(TextAreaElement inputElement, ButtonElement submitButton) {
  if (Uri.base.queryParameters.containsKey(SHAREABLE_URL_KEY)) {
    inputElement.value = decodeDiagramGraph(Uri.base.queryParameters[SHAREABLE_URL_KEY]!);
    submitButton.click();
  }
}
