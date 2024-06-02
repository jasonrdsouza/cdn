const BUFFER_KEY = "buffer"

require.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs",
    'monaco-vim': 'https://cdn.jsdelivr.net/npm/monaco-vim/dist/monaco-vim.min.js'
  },
});

function colorSchemeTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'vs-dark';
  }
  return 'vs';
}

require(['vs/editor/editor.main', 'monaco-vim'], function(a, MonacoVim) {

  let editor = monaco.editor.create(document.getElementById("editor"), {
    value: [
      '# ScratchPad',
      'Created and maintained by [Jason Dsouza](https://jasondsouza.org/)',
      '',
      '## Features',
      '- Vim keybindings',
      '- syntax highlighting',
      '- persistance (via browser localstorage)',
      '- dark-mode support'
    ].join('\n'),
    language: 'markdown',
    theme: colorSchemeTheme(),
    minimap: {
      enabled: true,
      renderCharacters: true,
    },
    fontSize: 18,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
  },
    automaticLayout: true,
  });
  var statusNode = document.getElementById('status');
  var vimMode = MonacoVim.initVimMode(editor, statusNode);

  // vimMode.Vim.defineEx('write', 'w', function() {
  //   // your own implementation on what you want to do when :w is pressed
  //   localStorage.setItem(BUFFER_KEY, editor.getValue());
  // });

  // automatically update colorscheme to match system preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    monaco.editor.setTheme(colorSchemeTheme());
  });

  function saveBuffer(e) {
    localStorage.setItem(BUFFER_KEY, editor.getValue());

    document.title = document.title.replace(/^\* /, "");
    textModified = false;
  };

  let textModified = false; // flag to track whether the text has been modified
  editor.addAction({
    id: "scratchpad-save",
    label: "Save Buffer",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
    precondition: null,
    keybindingContext: null,
    run: saveBuffer,
  });

  let firstChange = true;
  // Add a star to the window title when the text is changed
  editor.onDidChangeModelContent(function () {
    if (!textModified && !firstChange) {
      document.title = "* " + document.title;
      textModified = true;
    }
  });

  let storedBuffer = localStorage.getItem(BUFFER_KEY);
  if (storedBuffer) {
    editor.setValue(storedBuffer);
    firstChange = false;
  }

});
