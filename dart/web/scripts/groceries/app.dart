library groceries;

import 'dart:html'
    show Element, InputElement, KeyCode, KeyboardEvent, querySelector, window;
import 'dart:convert';
import 'package:cdn/uuid.dart';

part 'models.dart';
part 'TodoWidget.dart';
part 'TodoApp.dart';


void main() {
  new TodoApp();
}