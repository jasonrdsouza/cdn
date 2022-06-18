import 'dart:html';

void main() {
  print("Grocery list helper");
  List<GroceryItem> groceries = [];
  createGroceryListInput(groceries);
}

void createGroceryListInput(List<GroceryItem> groceries) {
  HtmlElement groceryList = querySelector('#groceryList') as HtmlElement;
  final input = TextInputElement();
  final button = SubmitButtonInputElement()..value = ' ➕';

  groceryList.onSubmit.listen((Event e) {
    e.preventDefault(); // prevent page from reloading

    final value = input.value;
    if (value != null && value.isNotEmpty) {
      input.value = "";
      groceries.add(GroceryItem.fromString(value));
      redraw(groceries);
    }
  });

  groceryList.children.add(DivElement()..children.addAll([input, button]));
}

LabelElement groceryHtml(GroceryItem item) {
  final checkbox = CheckboxInputElement();
  final itemText = SpanElement()..innerText = item.toString();
  return LabelElement()..children.addAll([checkbox, itemText]);
}

void redraw(List<GroceryItem> groceries) {
  List<Element> renderedList = [];
  for (Category category in Category.values) {
    var categoryItems = groceries.where((item) => item.category == category);
    if (categoryItems.isNotEmpty) {
      var section = Element.section()..id = category.name;
      section.children.add(HeadingElement.h2()..text = category.name);
      section.children.addAll(categoryItems.map(groceryHtml));
      renderedList.add(section);
    }
  }
  querySelector('#list')!.children = renderedList;
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
  late double amount;
  late AmountType amountType;
  late Category category;

  RegExp categoryRegex = RegExp(r"\[([a-zA-Z])\]");

  GroceryItem(String name, double amount, AmountType amountType, Category category)
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
      if (isNumeric(parts[0])) {
        this.amount = double.parse(parts[0]);
        this.name = parts.sublist(1).join(" ").toLowerCase();
      } else {
        this.amount = 1;
        this.name = parts.join(" ").toLowerCase();
      }
      this.amountType = AmountType.num; // assume a numeric amount type when unspecified
    } else {
      if (isNumeric(parts[0])) {
        this.amount = double.parse(parts[0]);

        this.amountType = fromAmountTypeString(parts[1]);
        if (this.amountType == AmountType.unknown) {
          this.amountType = AmountType.num;
          this.name = parts.sublist(1).join(" ").toLowerCase();
        } else {
          this.name = parts.sublist(2).join(" ").toLowerCase();
        }
      } else {
        this.amount = 1;
        this.amountType = AmountType.num; // if we couldn't parse an amount, we assume no amount type was specified
        this.name = parts.join(" ").toLowerCase();
      }
    }
  }

  bool isNumeric(String? s) {
    if (s == null) {
      return false;
    }
    return double.tryParse(s) != null;
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
