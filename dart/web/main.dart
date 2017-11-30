import 'dart:html';
import 'dart:math';

String lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';
String uppercaseLetters = lowercaseLetters.toUpperCase();
String numbers = '0123456789';
String symbols = '!@#\$%';
String ambiguousCharacters = 'iIlLoO01';

void main() {
  print('Password Generator Initiated');
  HtmlElement passwordField = querySelector('#password');
  HtmlElement generateField = querySelector('#generate-password');

  generateField.onClick.listen((_) {
    passwordField.text = constructPassword(requestedLength());
  });
}

String constructPassword(int length) {
  String alphabet = '';
  if (lowercaseAllowed()) {
    alphabet += lowercaseLetters;
  }
  if (uppercaseAllowed()) {
    alphabet += uppercaseLetters;
  }
  if (numbersAllowed()) {
    alphabet += numbers;
  }
  if (symbolsAllowed()) {
    alphabet += symbols;
  }
  if (avoidAmbiguousCharacters()) {
    alphabet = alphabet.replaceAll(new RegExp('[${ambiguousCharacters}]'), '');
  }

  Random rand = new Random.secure();
  String password = '';
  for (int i = 0; i < length; i++) {
    password += alphabet[rand.nextInt(alphabet.length)];
  }
  return password;
}

bool uppercaseAllowed() {
  return querySelector('#uppercase-letters').checked;
}

bool lowercaseAllowed() {
  return querySelector('#lowercase-letters').checked;
}

bool numbersAllowed() {
  return querySelector('#numbers').checked;
}

bool symbolsAllowed() {
  return querySelector('#symbols').checked;
}

bool avoidAmbiguousCharacters() {
  return querySelector('#avoid-ambiguous-characters').checked;
}

int requestedLength() {
  return querySelector('#length').valueAsNumber;
}

