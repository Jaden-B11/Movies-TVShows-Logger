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

document.addEventListener('DOMContentLoaded', () => {
  const episodeButtons = document.querySelectorAll('.episodeLink');
  const modal = document.getElementById('episodeModal');
  const closeModalBtn = document.getElementById('closeModal');
  const cancelModalBtn = document.getElementById('cancelModal');

  // Modal input fields when creating episode
  const formShowId = document.getElementById('formShowTvMazeLink');
  const formEpisodeId = document.getElementById('formEpisodeTvMazeId');
  const formEpisodeName = document.getElementById('formEpisodeName');
  const formEpisodeImage = document.getElementById('formEpisodeImage');

  const episodeImageDisplay = document.getElementById('episodeImage');
  const modalEpisodeNumber = document.getElementById('modalEpisodeNumber');
  const modalEpisodeName = document.getElementById('modalEpisodeName');
  const episodeSummary = document.getElementById('episodeSummary');

  episodeButtons.forEach(button => {
    button.addEventListener('click', () => {
      formShowId.value = button.getAttribute('data-show-tvmaze-id');
      formEpisodeId.value = button.getAttribute('data-episode-tvmaze-id');
      formEpisodeName.value = button.getAttribute('data-episode-name');
      formEpisodeImage.value = button.getAttribute('data-episode-image');

      episodeImageDisplay.src = button.getAttribute('data-episode-image');
      episodeImageDisplay.alt = button.getAttribute('data-episode-name');
      modalEpisodeName.textContent = button.dataset.episodeName;
      modalEpisodeNumber.textContent = button.dataset.episodeNumber;
      episodeSummary.textContent = button.getAttribute('data-episode-summary');

      // Show modal
      modal.style.display = 'block';
    });
  });

  // Close modal handlers
  [closeModalBtn, cancelModalBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  });

  // Optional: close modal when clicking outside modal content
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});


const editModal = document.getElementById('editMediaModal');
const openEditButtons = document.querySelectorAll('.openEditModal');
const closeEditBtn = document.getElementById('closeEditModal');

const formMediaId = document.getElementById('editMediaId');
const formMediaType = document.getElementById('editMediaType');
const formStatus = document.getElementById('editStatus');
const formComments = document.getElementById('editComments');
const formRating = document.getElementById('editRating');
const deleteMediaId = document.getElementById('deleteMediaId');
const deleteMediaType = document.getElementById('deleteMediaType');



openEditButtons.forEach(button => {
  button.addEventListener('click', () => {
    formMediaId.value = button.dataset.id;
    formMediaType.value = button.dataset.type;
    formStatus.value = button.dataset.status;
    formComments.value = button.dataset.comments;
    formRating.value = button.dataset.rating;
    deleteMediaId.value = button.dataset.id;
    deleteMediaType.value = button.dataset.type
    

    editModal.classList.remove('hidden');
  });
});

closeEditBtn?.addEventListener('click', () => {
  editModal.classList.add('hidden');
});