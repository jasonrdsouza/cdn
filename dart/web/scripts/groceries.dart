import 'dart:html';
import 'package:yaml/yaml.dart';

void main() async {
  print("Grocery list helper");
  var yaml = await HttpRequest.getString("assets/grocery_categories.yaml");
  GroceryAutoCategorizer autoCategorizer = GroceryAutoCategorizer.fromYaml(yaml);
  List<GroceryItem> groceries = [];
  createGroceryListInput(groceries, autoCategorizer);
}

void createGroceryListInput(List<GroceryItem> groceries, GroceryAutoCategorizer autoCategorizer) {
  HtmlElement groceryList = querySelector('#groceryList') as HtmlElement;
  final input = TextInputElement()..placeholder = 'Amount? Type? Item [Category]?';
  final button = SubmitButtonInputElement()..value = ' ➕';

  groceryList.onSubmit.listen((Event e) {
    e.preventDefault(); // prevent page from reloading

    final value = input.value;
    if (value != null && value.isNotEmpty) {
      input.value = "";
      var item = GroceryItem.fromString(value);
      item.category = autoCategorizer.categorize(item);
      groceries.add(item);
      redraw(groceries);
    }
  });

  groceryList.children.add(DivElement()..children.addAll([input, button]));
}

LabelElement groceryHtml(GroceryItem item, List<GroceryItem> groceries) {
  final checkbox = CheckboxInputElement();
  final itemText = SpanElement()..innerText = item.humanized();

  final deleteButton = SpanElement()..innerText = ' ✘';
  deleteButton.onDoubleClick.listen((_) {
    groceries.remove(item);
    redraw(groceries);
  });

  return LabelElement()..children.addAll([checkbox, itemText, deleteButton]);
}

void redraw(List<GroceryItem> groceries) {
  List<Element> renderedList = [];
  for (Category category in Category.values) {
    var categoryItems = groceries.where((item) => item.category == category);
    if (categoryItems.isNotEmpty) {
      var section = Element.section()..id = category.name;
      section.children.add(HeadingElement.h2()..text = category.name);
      section.children.addAll(categoryItems.map((i) => groceryHtml(i, groceries)));
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

Category categoryFromString(String str) {
  switch (str.toUpperCase()) {
    case 'P':
    case 'PRODUCE':
      return Category.PRODUCE;
    case 'B':
    case 'BAKERY':
      return Category.BAKERY;
    case 'M':
    case 'MEAT':
      return Category.MEAT;
    case 'F':
    case 'FROZEN':
      return Category.FROZEN;
    case 'H':
    case 'HOUSEHOLD':
      return Category.HOUSEHOLD;
    case 'C':
    case 'CANNED':
      return Category.CANNED;
    case 'D':
    case 'DAIRY':
      return Category.DAIRY;
    default:
      return Category.UNKNOWN;
  }
}

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
      this.amount = 0;
      this.amountType = AmountType.num;
      this.name = parts[0].toLowerCase();
    } else if (parts.length == 2) {
      if (isNumeric(parts[0])) {
        this.amount = double.parse(parts[0]);
        this.name = parts.sublist(1).join(" ").toLowerCase();
      } else {
        this.amount = 0;
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
        this.amount = 0;
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
      return categoryFromString(categoryString);
    }
    return Category.UNKNOWN;
  }

  String humanized() {
    var humanizedAmount = amount == 0 ? "" : amount.toString();
    var humanizedType = amountType == AmountType.num ? "" : amountType.toShortString();
    return "$humanizedAmount $humanizedType $name";
  }

  String toString() {
    return "$amount ${amountType.toShortString()} $name";
  }

  String toRepr() {
    return "{ Category: ${this.category}, Amount: ${this.amount}, Type: ${this.amountType}, Name: ${this.name} }";
  }
}

class GroceryAutoCategorizer {
  late Map<String, Category> knownCategorizations;

  GroceryAutoCategorizer(Map<String, Category> this.knownCategorizations);
  GroceryAutoCategorizer.fromYaml(String yaml) {
    this.knownCategorizations = {};

    YamlMap doc = loadYaml(yaml);
    doc.forEach((category, items) {
      var categoryEnum = categoryFromString(category);
      List.from(items).forEach((item) => knownCategorizations[item] = categoryEnum);
    });
  }

  Category categorize(GroceryItem item) {
    if (item.category != Category.UNKNOWN) {
      return item.category;
    } else if (knownCategorizations.containsKey(item.name)) {
      return knownCategorizations[item.name]!;
    }
    return Category.UNKNOWN;
  }
}
