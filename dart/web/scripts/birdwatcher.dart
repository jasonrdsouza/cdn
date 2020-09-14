import 'dart:html';

import 'mobilenet.dart';

void main() async {
  print('Bird Watcher Active!');

  ImageElement imageElement = querySelector('#img');
  DivElement consoleElement = querySelector('#console');
  InputElement fileInputElement = querySelector('#fileInput');

  fileInputElement.onChange.listen((event) async {
    FileList files = fileInputElement.files;
    if (files.length > 0) {
      File file = files.item(0);

      FileReader reader = new FileReader();
      reader.onLoad.listen((event) {
        imageElement.src = reader.result;
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
