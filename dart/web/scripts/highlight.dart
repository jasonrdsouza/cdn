// Dart helper function that can be called after the page has been populated to
// automatically syntax highlight any code blocks using highlight.js
@JS()
library highlight;

import 'package:js/js.dart';

@JS()
external void findAndHighlightCodeBlocks();
