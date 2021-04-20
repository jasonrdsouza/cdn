import 'dart:html';
import 'dart:convert';

void main() {
  print("Formatter Active.");

  ButtonElement submitButton = querySelector('#submitFormat') as ButtonElement;
  TextAreaElement inputElement = querySelector('#input') as TextAreaElement;
  HtmlElement formattedBlock = querySelector('#jsonOutput') as HtmlElement;

  submitButton.onClick.listen((_) {
    var input = inputElement.value;
    if (input != null) {
      formattedBlock.text = formatJson(input);
    }
  });
}

String formatJson(String inputJson) {
  print("Formatting ${inputJson}");
  try {
    return JsonEncoder.withIndent('  ').convert(json.decode(inputJson));
  } on JsonUnsupportedObjectError catch (err) {
    print("Error parsing JSON: ${err.cause}");
    return "Unable to parse supplied JSON";
  }
}
