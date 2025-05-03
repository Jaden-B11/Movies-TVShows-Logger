const words = document.querySelectorAll('#quote .word');
let current = 0;

const interval = setInterval(() => {
    words[current].classList.remove('active');
    current++;

    if (current < words.length) {
      words[current].classList.add('active');
    } else {
      clearInterval(interval); // stop once "Track." is highlighted
    }
}, 1000)

function hideDiv() {
  document.getElementById('searchSuggestions').style.display = 'none';
}