import 'dart:html';
import 'package:intl/intl.dart';

DateTime referenceDate() {
  String? userSuppliedYear = Uri.base.queryParameters["year"];
  if (userSuppliedYear != null && userSuppliedYear.isNotEmpty) {
    var year = int.tryParse(userSuppliedYear);
    if (year != null) {
      return new DateTime(year);
    }
  }

  return DateTime.now();
}

void main() async {
  print("Calendar");

  ParagraphElement yearElement = querySelector('#year') as ParagraphElement;

  TableSectionElement monthsSection = querySelector('#months') as TableSectionElement;
  TableRowElement monthsElement = monthsSection.addRow();

  TableSectionElement daysSection = querySelector('#days') as TableSectionElement;

  // Set year
  DateTime currentDate = referenceDate();
  yearElement.text = DateFormat.y().format(currentDate);

  // Set month headings
  for (var month = 1; month <= DateTime.monthsPerYear; month++) {
    TableCellElement monthElement = monthsElement.addCell();
    monthElement.text = DateFormat.MMM().format(new DateTime(currentDate.year, month));
  }

  // Populate days
  for (var day = 1; day <= 31; day++) {
    TableRowElement daysRow = daysSection.addRow();
    for (var month = 1; month <= 12; month++) {
      TableCellElement dayCell = daysRow.addCell();

      var currentDay = new DateTime(currentDate.year, month, day);
      String formattedDay = DateFormat.d().format(currentDay);
      String formattedWeekday = DateFormat.E().format(currentDay);

      if (int.parse(formattedDay) < day) {
        // invalid date (eg. Feb 30th), so leave cell blank
        continue;
      }

      if (['Sat', 'Sun'].contains(formattedWeekday)) {
        dayCell.classes.add("weekend");
      }

      var dateElement = SpanElement();
      dateElement.classes.add("date");
      dateElement.text = formattedDay;

      var weekdayElement = SpanElement();
      weekdayElement.classes.add("day");
      weekdayElement.text = formattedWeekday;

      dayCell.children.addAll([dateElement, weekdayElement]);
    }
  }
}
