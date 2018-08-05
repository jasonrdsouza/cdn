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
  CheckboxInputElement element = querySelector('#uppercase-letters');
  return element.checked;
}

bool lowercaseAllowed() {
  CheckboxInputElement element = querySelector('#lowercase-letters');
  return element.checked;
}

bool numbersAllowed() {
  CheckboxInputElement element = querySelector('#numbers');
  return element.checked;
}

bool symbolsAllowed() {
  CheckboxInputElement element = querySelector('#symbols');
  return element.checked;
}

bool avoidAmbiguousCharacters() {
  CheckboxInputElement element = querySelector('#avoid-ambiguous-characters');
  return element.checked;
}

int requestedLength() {
  InputElement element = querySelector('#length');
  return element.valueAsNumber;
}

