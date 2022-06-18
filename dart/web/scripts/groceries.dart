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
      addGroceryListItem(groceryList, GroceryItem.fromString(value));
    }
  });

  return DivElement()..children.addAll([input, button]);
}

void addGroceryListItem(HtmlElement groceryList, GroceryItem item) {
  print("Adding grocery list item: ${item.toRepr()}");
  final checkbox = CheckboxInputElement();
  final itemText = SpanElement()..innerText = item.toString();
  final listItem = LabelElement()..children.addAll([checkbox, itemText]);

  groceryList.children.add(listItem);
}

enum AmountType {
  oz, // ounces/ fluid ounces
  lb, // pounds
  cup, // cups
  quart, // quarts
  num, // count
  pkg, // normal sized package
  ml, // milliliters
  gram, // grams
  unknown; // no good existing amount type

  String toShortString() => this.toString().split('.').last;
}

enum Category { PRODUCE, BAKERY, MEAT, FROZEN, HOUSEHOLD, CANNED, DAIRY, UNKNOWN }

class GroceryItem {
  late String name;
  late int amount;
  late AmountType amountType;
  late Category category;

  RegExp categoryRegex = RegExp(r"\[([a-zA-Z])\]");

  GroceryItem(String name, int amount, AmountType amountType, Category category)
      : this.name = name.toLowerCase(),
        this.amount = amount,
        this.amountType = amountType,
        this.category = category;

  GroceryItem.fromString(String description) {
    List<String> parts = description.split(" ");
    this.category = locateAndExtractCategory(parts);

    if (parts.length == 1) {
      // no amount given
      this.amount = 1;
      this.amountType = AmountType.num;
      this.name = parts[0].toLowerCase();
    } else if (parts.length == 2) {
      this.amount = int.parse(parts[0]);
      this.amountType = AmountType.num;
      this.name = parts.sublist(1).join(" ").toLowerCase();
    } else {
      this.amount = int.parse(parts[0]);
      this.amountType = fromAmountTypeString(parts[1]);
      this.name = parts.sublist(2).join(" ").toLowerCase();
    }
  }

  AmountType fromAmountTypeString(String amountTypePart) {
    return AmountType.values
        .firstWhere((a) => a.toShortString() == amountTypePart.toLowerCase(), orElse: () => AmountType.unknown);
  }

  Category locateAndExtractCategory(List<String> parts) {
    var idx = parts.indexWhere((part) => isCategory(part));
    if (idx == -1)
      return Category.UNKNOWN;
    else
      return extractCategory(parts.removeAt(idx));
  }

  bool isCategory(String input) {
    return categoryRegex.hasMatch(input);
  }

  Category extractCategory(String input) {
    if (isCategory(input)) {
      var categoryString = categoryRegex.firstMatch(input)!.group(1);
      if (categoryString == null) {
        return Category.UNKNOWN;
      }
      switch (categoryString.toUpperCase()) {
        case 'P':
          return Category.PRODUCE;
        case 'B':
          return Category.BAKERY;
        case 'M':
          return Category.MEAT;
        case 'F':
          return Category.FROZEN;
        case 'H':
          return Category.HOUSEHOLD;
        case 'C':
          return Category.CANNED;
        case 'D':
          return Category.DAIRY;
        default:
          return Category.UNKNOWN;
      }
    }
    return Category.UNKNOWN;
  }

  String toString() {
    return "$amount ${amountType.toShortString()} $name";
  }

  String toRepr() {
    return "{ Category: ${this.category}, Amount: ${this.amount}, Type: ${this.amountType}, Name: ${this.name} }";
  }
}
