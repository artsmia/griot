# Griot

Griot is an open-source iPad application that facilitates engagement with a collection of **objects** (artifacts, artwork, graphs, or anything else that can be represented visually) through **annotations** (points of interest on the object itself) and **stories** (related text-based and multimedia content, presented as a series of pages).

The Griot framework requires three components:

1. The Griot software itself (this);
2. A server for creating and serving tiled images ([tilesaw][]); and
3. An interface for loading content and bundling it in JSON format
   ([GriotWP][]).

## Installation

1. Deploy Griot to the directory where you would like it to run.
2. Edit `js/config.js` to point to your source of image tiles (i.e. your implementation of [tilesaw][]) and application content (i.e. your implementation of [GriotWP][]).

[tilesaw]: https://github.com/artsmia/tilesaw
[GriotWP]: https://github.com/artsmia/GriotWP