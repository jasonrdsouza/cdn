// Custom trigger for highlight.js so I can call it from Dart
function findAndHighlightCodeBlocks() {
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
}
