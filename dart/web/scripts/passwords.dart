import 'dart:html';
import 'dart:math';

String lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';
String uppercaseLetters = lowercaseLetters.toUpperCase();
String numbers = '0123456789';
String symbols = '!@#\$%';
String ambiguousCharacters = 'iIlLoO01';

void main() {
  print('Password Generator Initiated');
  HtmlElement passwordField = querySelector('#password') as HtmlElement;
  HtmlElement generateField = querySelector('#generate-password') as HtmlElement;

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
  CheckboxInputElement element = querySelector('#uppercase-letters') as CheckboxInputElement;
  return element.checked!;
}

bool lowercaseAllowed() {
  CheckboxInputElement element = querySelector('#lowercase-letters') as CheckboxInputElement;
  return element.checked!;
}

bool numbersAllowed() {
  CheckboxInputElement element = querySelector('#numbers') as CheckboxInputElement;
  return element.checked!;
}

bool symbolsAllowed() {
  CheckboxInputElement element = querySelector('#symbols') as CheckboxInputElement;
  return element.checked!;
}

bool avoidAmbiguousCharacters() {
  CheckboxInputElement element = querySelector('#avoid-ambiguous-characters') as CheckboxInputElement;
  return element.checked!;
}

int requestedLength() {
  InputElement element = querySelector('#length') as InputElement;
  return element.valueAsNumber!.toInt();
}
