import 'dart:html';
import 'dart:convert';
import 'package:crypto/crypto.dart';

void main() {
  print("Authenticator Active.");

  ButtonElement submitButton = querySelector('#submit') as ButtonElement;
  InputElement inputElement = querySelector('#input') as InputElement;

  submitButton.onClick.listen((_) {
    var privateKey = inputElement.value;
    if (privateKey != null) {
      print("Received key: ${privateKey}");
      print("Current cookies: ${window.document.cookie}");
      window.document.cookie = secureHashCookie(privateKey);
      print("New cookies: ${window.document.cookie}");
    }
  });
}

String secureHashCookie(String key) {
  var bytes = utf8.encode(key);
  var digest = sha256.convert(bytes);
  return "auth=${digest};secure";
}
