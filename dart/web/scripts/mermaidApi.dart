@JS('mermaid')
library mermaidApi;

import 'package:js/js.dart';

@JS()
external String render(String id, String graphDefinition);

@JS()
external void initialize();
