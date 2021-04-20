import 'dart:html';

import 'mobilenet.dart';

void main() async {
  print('Bird Watcher Active!');

  ImageElement imageElement = querySelector('#img') as ImageElement;
  DivElement consoleElement = querySelector('#console') as DivElement;
  InputElement fileInputElement = querySelector('#fileInput') as InputElement;

  fileInputElement.onChange.listen((event) async {
    List<File>? files = fileInputElement.files;
    if (files != null && files.length > 0) {
      File file = files.first;

      FileReader reader = new FileReader();
      reader.onLoad.listen((event) {
        imageElement.src = reader.result as String?;
      });
      reader.onError.listen((event) {
        print('Error loading image');
      });
      reader.readAsDataUrl(file);

      var predictions = await classifyImage('img');
      print(predictions);
      String topPrediction = (predictions[0]['className']).split(",").first;
      var predictionProbability = (predictions[0]['probability'] * 100).round();

      consoleElement.innerText = "Neural Net Prediction: ${topPrediction}\nConfidence: ${predictionProbability}%";
    }
  });
}
