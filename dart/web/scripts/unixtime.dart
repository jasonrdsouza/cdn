import 'dart:html';

void main() {
  print("Time Converter Active.");

  ButtonElement submitButton = querySelector('#submitConvert') as ButtonElement;
  TextAreaElement inputElement = querySelector('#input') as TextAreaElement;
  HtmlElement outputElement = querySelector('#output') as HtmlElement;

  submitButton.onClick.listen((_) {
    try {
      DateTime parsedDateTime = fromUnixTimestamp(int.parse(inputElement.value!));
      var utcTime = parsedDateTime.toString();
      var localTime = parsedDateTime.toLocal();
      outputElement.text = "UTC:\t${utcTime}\nLocal:\t${localTime}";
    } catch (err) {
      outputElement.text = "Invalid Unix Timestamp specified";
      return;
    }
  });
}

DateTime fromUnixTimestamp(int timestampSeconds) {
  return DateTime.fromMillisecondsSinceEpoch(timestampSeconds * 1000, isUtc: true);
}
