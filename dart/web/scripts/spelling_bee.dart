import 'dart:html';
import 'dart:math';

void main() async {
  print('Spelling Bee Solver Initiated');
  InputElement lettersField = querySelector('#letters');
  InputElement requiredLetterField = querySelector('#required-letter');
  InputElement submitButton = querySelector('#solve');
  DivElement resultSummaryField = querySelector('#result-summary');
  PreElement resultsField = querySelector('#results');

  Iterable<String> dictionary = await fetchDictionary('assets/official_scrabble_players_dictionary.txt');
  Iterable<String> spellingBeeDictionary = pruneDictionary(dictionary);
  print('Fetched Spelling Bee dictionary');
  
  submitButton.onClick.listen((_) {
    String letters = lettersField.value.toLowerCase();
    String requiredLetter = requiredLetterField.value.toLowerCase();
    print('Solving puzzle with letters "${letters}", requiring "${requiredLetter}"');

    Set<String> result = findWords(requiredLetter, stringToSet(letters), spellingBeeDictionary);
    print('Found words: ${result}');

    resultSummaryField.innerText = summarizeWords(result);
    List<String> sortedResults = result.toList()..sort();
    resultsField.innerText = sortedResults.join("\n");
  });
}

Set<String> stringToSet(String s) {
  return Set.of(s.split(''));
}

Future<Iterable<String>> fetchDictionary(String dictionaryPath) {
  Future<String> rawDictionary = HttpRequest.getString(dictionaryPath);
  return rawDictionary.then((s) => s.split("\n"));
}

Iterable<String> pruneDictionary(Iterable<String> dictionary) {
  return Set.of(dictionary.map((s) => s.toLowerCase())
                   .where((s) => s.length > 3));
}

String summarizeWords(Iterable<String> words) {
  int longestWord = words.fold(0, (currentLongest, nextWord) => max(currentLongest, nextWord.length));
  return "Found ${words.length} words, with a max character count of ${longestWord}";
}

bool validWord(String requiredLetter, Set<String> allLetters, String word) {
  return word.contains(requiredLetter) && stringToSet(word).difference(allLetters).isEmpty;
}

Set<String> findWords(String requiredLetter, Set<String> allLetters, Iterable<String> dictionary) {
  return Set.of(dictionary.where(
      (word) => validWord(requiredLetter, allLetters, word)));
}