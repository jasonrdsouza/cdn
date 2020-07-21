let net;

async function mobileNetPredictImage(imageElementId) {
  // Load the model if necessary
  if (!net) {
    console.log('Loading model');
    net = await mobilenet.load();
  }

  // Make a prediction through the model on our image.
  console.log(`Fetching image with id ${imageElementId}`)
  const imgEl = document.getElementById(imageElementId);
  const result = await net.classify(imgEl);
  console.log('Classification successful')
  return JSON.stringify(result);
}
