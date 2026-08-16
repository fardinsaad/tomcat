# Tomcat — Instruction Inference

Project site for **Theory of Mind in Action: The Instruction Inference Task in Dynamic
Human–Agent Collaboration** (Artificial Intelligence journal, minor revision).

Fardin Saad · Pradeep K. Murukannaiah · Munindar P. Singh
NC State University · TU Delft

## Running locally

The page assembles itself from `components/*.html` via `fetch()`, which browsers block on
`file://`. Serve it over HTTP instead:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Layout

```
index.html            nav + component slots + footer
css/style.css         all styling, including the four themes
js/main.js            component loader, counters, tabs, theme switcher
components/01..09     one section each, numbered in render order
assets/stimuli/       scenario GIFs (initial / observed / completed)
```

To update annotation status, edit the cell classes in `components/03-matrix.html`.
The progress rail recounts itself from the DOM, so no other file needs changing.
