# Flashcard-Dev

Markdown Based Flashcards using Spaced repetition for Developers

## Why

When learning flashcards can be really powerful tool. With technology, we can employ <https://en.wikipedia.org/wiki/Spaced_repetition>.

> Spaced repetition is an evidence-based learning technique that is usually performed with flashcards. Newly introduced, and more difficult flashcards are shown more frequently, while older and less difficult flashcards are shown less frequently in order to exploit the psychological spacing effect. The use of spaced repetition has been proven to increase the rate of learning.

## Technology

- vitejs
- vitest
- playwrite for e2e tests
- [Tailwindcss](https://tailwindcss.com/)
- [MDI](https://materialdesignicons.com/)

## Goal

Using flashcards and spaced repetition for learning is great, but I found the [ANKI](https://apps.ankiweb.net/) hard to use and UI really dated. I tried looking for alternatives and used [brainscape](https://www.brainscape.com/) but Anki seems to be the gold standard. So the goal is to make a developer friendly version that is free and easy to modify in Markdown, and share modify cards via git repos.

- Decks
  - managed via code and extendable
  - easy to edit via markdown
  - collaborate and share via repos in GitHub.

## History

I (Chris Towles) think this makes the third time I've started writing flashcard application, I've done them in `vue`, `flutter`, and `angular` in the past. Flipping flashcards on the screen was always easy but when managing a backend/database to allow sharing flashcard decks, edit and created decks always ended up a big mess. I've designed databases and Firebase backends but in the end I felt the amount of work required lead to me making trade-offs and losing interest as the complexity went up.

This time I link will be different. By allowing git and GitHub to basically be the backend, and I can use the web tooling of [Vite](https://vitejs.dev/), [vitest](https://vitest.dev/), and node and just keep everything on local storage. I can also integrate with the ANKI API later if wanted.

The goal of using Markdown comes because I document and take notes every day in Markdown and the flow and productivity is amazing. Using GitHub Copilot, plus a few vs-code [grammar extensions](https://github.com/ChrisTowles/dotfiles/blob/main/vscode-extendsions.md#grammar-and-spelling) makes it so productive. Add the ability to copy and paste images into the markdown via extensions, and it's nearly perfect.

I copied a lot this project from [Anthony Fu's](https://github.com/sponsors/antfu) [Slidev](https://github.com/slidevjs/slidev) as the starting point and then starting to modify the repo from there.

First I learn so much from reading others code and reading Anthony's code is always top-notch. If you don't know who he is, he's basically the most [productive developer](https://github.com/antfu) ever! And besides after using `Slidev` and then looking at its source it was a large part of the inspiration to start this project again.