import 'dart:html';

void main() {
  print("Time Converter Active.");

  ButtonElement submitButton = querySelector('#submitConvert');
  TextAreaElement inputElement = querySelector('#input');
  HtmlElement outputElement = querySelector('#output');

  submitButton.onClick.listen((_) {
    try {
      DateTime parsedDateTime = fromUnixTimestamp(int.parse(inputElement.value));
      outputElement.text = parsedDateTime.toString();
    } catch (err) {
      outputElement.text = "Invalid Unix Timestamp specified";
      return;
    }
  });
}

DateTime fromUnixTimestamp(int timestampSeconds) {
  return DateTime.fromMillisecondsSinceEpoch(timestampSeconds * 1000);
}
