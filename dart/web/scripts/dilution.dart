import 'dart:html';

void main() {
  print("Dilution calculator active");

  ButtonElement submitButton = querySelector('#submitConvert') as ButtonElement;
  TextAreaElement inputVolumeElement = querySelector('#inputVolume') as TextAreaElement;
  TextAreaElement inputConcentrationElement = querySelector('#inputConcentration') as TextAreaElement;
  TextAreaElement desiredConcentrationElement = querySelector('#desiredConcentration') as TextAreaElement;
  HtmlElement outputElement = querySelector('#output') as HtmlElement;

  submitButton.onClick.listen((_) {
    try {
      double inputVolume = double.parse(inputVolumeElement.value!);
      double inputConcentration = double.parse(inputConcentrationElement.value!);
      double desiredConcentration = double.parse(desiredConcentrationElement.value!);
      double desiredVolume = inputVolume * inputConcentration / desiredConcentration;

      outputElement.text = """
Desired Volume * Desired Concentration = Original Volume * Original Concentration
Desired Volume = Original Volume * Original Concentration / Desired Concentration
Desired Volume = ${inputVolume} * ${inputConcentration} / ${desiredConcentration}
Desired Volume = ${desiredVolume}

So add ${round(desiredVolume - inputVolume)} ounces of water for a perfectly diluted dram!
      """;
    } catch (err) {
      outputElement.text = "Invalid volume or concentration specified";
      return;
    }
  });
}

double round(double value) {
  return (value * 100).roundToDouble() / 100;
}
