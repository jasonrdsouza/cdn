import 'dart:html';
import 'dart:convert';

void main() {
  print("Formatter Active.");

  ButtonElement submitButton = querySelector('#submitFormat');
  TextAreaElement inputElement = querySelector('#input');
  HtmlElement formattedBlock = querySelector('#jsonOutput');

  submitButton.onClick.listen((_) {
    formattedBlock.text = formatJson(inputElement.value);
  });
}

String formatJson(String inputJson) {
  print("Formatting ${inputJson}");
  try {
    return JsonEncoder.withIndent('  ').convert(json.decode(inputJson));
  } catch (err) {
    print("Error parsing JSON: ${err.message}");
    return "Unable to parse supplied JSON";
  }
}
