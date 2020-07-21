import 'dart:html';

import 'mobilenet.dart';
//import 'dart:html'

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
      consoleElement.innerText = predictions[0]['className'];
    }
  });


}
