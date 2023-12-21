import 'dart:html';
import 'package:http/http.dart' as http;

const LOCAL_NOTEBOOK_URL_KEY = "nb";
const NAS_NOTEBOOK_URL_KEY = "nnb";
const EXTERNAL_NOTEBOOK_URL_KEY = "enb";

void main() {
  print("Notebook Active.");
  ScriptElement notebookElement = querySelector('#nb') as ScriptElement;

  if (Uri.base.queryParameters.containsKey(LOCAL_NOTEBOOK_URL_KEY)) {
    var notebookName = Uri.base.queryParameters[LOCAL_NOTEBOOK_URL_KEY]!;
    var source = Uri.https('studio.dsouza.io', 'notebooks/${notebookName}.starboard.nb');
    loadNotebook(source, notebookElement);
  } else if (Uri.base.queryParameters.containsKey(NAS_NOTEBOOK_URL_KEY)) {
    var notebookName = Uri.base.queryParameters[NAS_NOTEBOOK_URL_KEY]!;
    var source = Uri.https('data.mattwilliams.cloud', notebookName);
    loadNotebook(source, notebookElement);
  } else if (Uri.base.queryParameters.containsKey(EXTERNAL_NOTEBOOK_URL_KEY)) {
    var source = Uri.parse(Uri.base.queryParameters[LOCAL_NOTEBOOK_URL_KEY]!);
    populateNotebook(source, notebookElement);
  } else {
    initializeStarboard();
  }
}

Future loadNotebook(Uri source, ScriptElement notebookElement) async {
  populateNotebook(source, notebookElement).then((_) => initializeStarboard()).onError((error, stackTrace) {
    print("Error fetching notebook: ${error}");
    initializeStarboard();
  });
}

Future populateNotebook(Uri source, ScriptElement notebookElement) async {
  var response = await http.get(source);
  if (response.statusCode == 200) {
    notebookElement.text = response.body;
    print('Notebook successfully loaded from ${source}');
  } else {
    notebookElement.text = '''
# %% [markdown]
# Blank Notebook''';
    print("Couldn't load notebook from ${source}");
  }
}

// do the initialization here instead of a regular script tag to ensure that our notebook
// content gets loaded first
initializeStarboard() {
  ScriptElement starboardElement = ScriptElement();
  starboardElement.src = "https://unpkg.com/starboard-notebook/dist/starboard-notebook.js";
  querySelector("#body")!.append(starboardElement);
}
