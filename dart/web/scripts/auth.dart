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
      window.document.cookie = secureHashCookie(privateKey);
    }
  });
}

String secureHashCookie(String key) {
  var bytes = utf8.encode(key);
  var digest = sha256.convert(bytes);
  var maxAge = 60 * 60 * 24 * 365;
  return "auth=${digest};max-age=${maxAge};secure";
}

String fetchAuthToken() {
  var cookieString = window.document.cookie;
  if (cookieString == null) {
    return "";
  } else {
    for (var el in cookieString.split(";")) {
      var cookiePair = el.split("=");
      if (cookiePair.length == 2 && cookiePair.first == "auth") {
        return cookiePair.last;
      }
    }
    return "";
  }
}
