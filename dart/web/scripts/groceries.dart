import 'dart:html';

void main() {
  print("Grocery list helper");

  HtmlElement groceryList = querySelector('#groceryList') as HtmlElement;
  groceryList.children.add(createGroceryListInput(groceryList));
}

DivElement createGroceryListInput(HtmlElement groceryList) {
  final input = TextInputElement();
  final button = SubmitButtonInputElement()..value = ' ➕';

  groceryList.onSubmit.listen((Event e) {
    e.preventDefault(); // prevent page from reloading

    final value = input.value;
    if (value != null && value.isNotEmpty) {
      input.value = "";
      addGroceryListItem(groceryList, value);
    }
  });

  return DivElement()..children.addAll([input, button]);
}

void addGroceryListItem(HtmlElement groceryList, String itemName) {
  final checkbox = CheckboxInputElement();
  final itemText = SpanElement()..innerText = itemName;
  final item = LabelElement()..children.addAll([checkbox, itemText]);

  groceryList.children.add(item);
}
