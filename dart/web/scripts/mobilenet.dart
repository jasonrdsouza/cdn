@JS()
library mobilenet;

import 'dart:html';
import "dart:convert";

import 'package:js/js.dart';

@JS('mobileNetPredictImage')
external String predictImage(String imageElementId);

dynamic classifyImage(String imageElementId) async {
  var encodedPredictions = await promiseToFuture<String>(predictImage(imageElementId));
  return jsonDecode(encodedPredictions);
}
