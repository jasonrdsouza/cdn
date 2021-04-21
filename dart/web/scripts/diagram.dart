import 'dart:html';
import 'dart:svg';
import 'mermaidApi.dart';

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
    }
  });
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
