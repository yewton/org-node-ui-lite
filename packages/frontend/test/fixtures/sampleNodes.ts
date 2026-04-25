import type { components } from "../../src/api/api.d.ts";

type NodeSummary = components["schemas"]["NodeSummary"];
type Edge = components["schemas"]["Edge"];
type Node = components["schemas"]["Node"];
type Graph = components["schemas"]["Graph"];

/**
 * 30-node sample knowledge graph covering Mathematics, Programming, Science,
 * Philosophy, History, and Project topics. Used by unit tests and E2E tests.
 *
 * Edges encode: Math→Prog, Sci relationships, Phil chains, Hist sequence,
 * and hub links from proj-index / proj-reading-list / proj-notes-method.
 *
 * Backlinks in SAMPLE_NODES are derived from SAMPLE_EDGES.
 */

export const SAMPLE_NODE_SUMMARIES: NodeSummary[] = [
	// Mathematics (5)
	{ id: "math-linear-algebra", title: "Linear Algebra" },
	{ id: "math-calculus", title: "Calculus" },
	{ id: "math-number-theory", title: "Number Theory" },
	{ id: "math-statistics", title: "Statistics" },
	{ id: "math-topology", title: "Topology" },
	// Programming (5)
	{ id: "prog-algorithms", title: "Algorithms" },
	{ id: "prog-data-structures", title: "Data Structures" },
	{ id: "prog-functional", title: "Functional Programming" },
	{ id: "prog-emacs-lisp", title: "Emacs Lisp" },
	{ id: "prog-typescript", title: "TypeScript" },
	// Science (5)
	{ id: "sci-biology", title: "Biology" },
	{ id: "sci-chemistry", title: "Chemistry" },
	{ id: "sci-physics", title: "Physics" },
	{ id: "sci-astronomy", title: "Astronomy" },
	{ id: "sci-neuroscience", title: "Neuroscience" },
	// Philosophy (5)
	{ id: "phil-epistemology", title: "Epistemology" },
	{ id: "phil-ethics", title: "Ethics" },
	{ id: "phil-logic", title: "Logic" },
	{ id: "phil-metaphysics", title: "Metaphysics" },
	{ id: "phil-mind", title: "Philosophy of Mind" },
	// History (5)
	{ id: "hist-ancient", title: "Ancient History" },
	{ id: "hist-medieval", title: "Medieval History" },
	{ id: "hist-modern", title: "Modern History" },
	{ id: "hist-science", title: "History of Science" },
	{ id: "hist-technology", title: "History of Technology" },
	// Projects (5)
	{ id: "proj-index", title: "Index" },
	{ id: "proj-emacs-setup", title: "Emacs Setup" },
	{ id: "proj-reading-list", title: "Reading List" },
	{ id: "proj-notes-method", title: "Notes Methodology" },
	{ id: "proj-daily-log", title: "Daily Log" },
];

// 31 directed edges forming an interconnected knowledge graph
export const SAMPLE_EDGES: Edge[] = [
	// Mathematics foundations
	{ source: "math-linear-algebra", dest: "prog-algorithms" },
	{ source: "math-calculus", dest: "sci-physics" },
	{ source: "math-statistics", dest: "sci-biology" },
	{ source: "math-number-theory", dest: "prog-functional" },
	{ source: "math-topology", dest: "phil-metaphysics" },
	// Programming chain
	{ source: "prog-algorithms", dest: "prog-data-structures" },
	{ source: "prog-data-structures", dest: "prog-emacs-lisp" },
	{ source: "prog-functional", dest: "prog-typescript" },
	{ source: "prog-emacs-lisp", dest: "proj-emacs-setup" },
	// Science relationships
	{ source: "sci-chemistry", dest: "sci-biology" },
	{ source: "sci-biology", dest: "sci-neuroscience" },
	{ source: "sci-physics", dest: "sci-astronomy" },
	{ source: "sci-neuroscience", dest: "phil-mind" },
	// Philosophy chain
	{ source: "phil-logic", dest: "phil-epistemology" },
	{ source: "phil-epistemology", dest: "phil-metaphysics" },
	{ source: "phil-ethics", dest: "phil-mind" },
	// History sequence
	{ source: "hist-ancient", dest: "hist-medieval" },
	{ source: "hist-medieval", dest: "hist-modern" },
	{ source: "hist-science", dest: "hist-technology" },
	{ source: "hist-technology", dest: "prog-algorithms" },
	// Hub: proj-index links to five topic nodes
	{ source: "proj-index", dest: "math-linear-algebra" },
	{ source: "proj-index", dest: "prog-algorithms" },
	{ source: "proj-index", dest: "sci-physics" },
	{ source: "proj-index", dest: "phil-logic" },
	{ source: "proj-index", dest: "hist-modern" },
	// Reading list links
	{ source: "proj-reading-list", dest: "hist-science" },
	{ source: "proj-reading-list", dest: "sci-astronomy" },
	{ source: "proj-reading-list", dest: "phil-ethics" },
	// Notes workflow
	{ source: "proj-notes-method", dest: "prog-emacs-lisp" },
	{ source: "proj-notes-method", dest: "proj-index" },
	{ source: "proj-daily-log", dest: "proj-notes-method" },
];

export const SAMPLE_GRAPH: Graph = {
	nodes: SAMPLE_NODE_SUMMARIES,
	edges: SAMPLE_EDGES,
};

/**
 * Detailed node objects with raw Org-mode content and computed backlinks.
 * Backlinks are derived from SAMPLE_EDGES (dest node lists its source nodes).
 */
export const SAMPLE_NODES: Record<string, Node> = {
	"math-linear-algebra": {
		id: "math-linear-algebra",
		title: "Linear Algebra",
		raw: `* Linear Algebra

Linear algebra concerns linear equations, linear maps, and vector spaces.

** Key Concepts

- Vector spaces and subspaces
- Linear transformations
- Eigenvalues and eigenvectors: $A\\mathbf{v} = \\lambda\\mathbf{v}$

** NumPy Example

#+BEGIN_SRC python
import numpy as np
A = np.array([[1, 2], [3, 4]])
eigenvalues, _ = np.linalg.eig(A)
#+END_SRC`,
		backlinks: [{ source: "proj-index", title: "Index" }],
	},

	"math-calculus": {
		id: "math-calculus",
		title: "Calculus",
		raw: `* Calculus

The study of continuous change.

** Fundamental Theorem

$$\\int_a^b f'(x)\\,dx = f(b) - f(a)$$

** Useful Limits

$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$`,
		backlinks: [],
	},

	"math-number-theory": {
		id: "math-number-theory",
		title: "Number Theory",
		raw: `* Number Theory

The study of integers and prime numbers.

** Modular Arithmetic

#+BEGIN_EXAMPLE
17 ≡ 2 (mod 5)
#+END_EXAMPLE

Fundamental to cryptography (RSA, Diffie-Hellman).`,
		backlinks: [],
	},

	"math-statistics": {
		id: "math-statistics",
		title: "Statistics",
		raw: `* Statistics

Data collection, analysis, and interpretation.

** Descriptive Statistics

- Mean: $\\bar{x} = \\frac{1}{n}\\sum x_i$
- Std dev: $s = \\sqrt{\\frac{\\sum(x_i - \\bar{x})^2}{n-1}}$

** Normal Distribution

$f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$`,
		backlinks: [],
	},

	"math-topology": {
		id: "math-topology",
		title: "Topology",
		raw: `* Topology

Properties preserved under continuous deformation.

** Topological Spaces

A topology $\\tau$ on $X$ satisfies:
1. $\\emptyset, X \\in \\tau$
2. Arbitrary unions of open sets are open
3. Finite intersections of open sets are open`,
		backlinks: [],
	},

	"prog-algorithms": {
		id: "prog-algorithms",
		title: "Algorithms",
		raw: `* Algorithms

Finite sequences of instructions for solving problems.

** Time Complexity

| Algorithm     | Complexity  |
|---------------|-------------|
| Binary search | O(log n)    |
| Merge sort    | O(n log n)  |
| Quick sort    | O(n log n) avg |

** QuickSort

#+BEGIN_SRC python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    return (quicksort([x for x in arr if x < pivot]) +
            [x for x in arr if x == pivot] +
            quicksort([x for x in arr if x > pivot]))
#+END_SRC`,
		backlinks: [
			{ source: "math-linear-algebra", title: "Linear Algebra" },
			{ source: "hist-technology", title: "History of Technology" },
			{ source: "proj-index", title: "Index" },
		],
	},

	"prog-data-structures": {
		id: "prog-data-structures",
		title: "Data Structures",
		raw: `* Data Structures

Organizing and storing data for efficient access.

** Complexity Summary

- Array: O(1) access, O(n) insertion
- BST: O(log n) average
- Hash table: O(1) average

** TypeScript Example

#+BEGIN_SRC typescript
interface Graph<T> {
  adjacency: Map<T, T[]>;
}
#+END_SRC`,
		backlinks: [{ source: "prog-algorithms", title: "Algorithms" }],
	},

	"prog-functional": {
		id: "prog-functional",
		title: "Functional Programming",
		raw: `* Functional Programming

Computation as evaluation of mathematical functions.

** Principles

1. Pure functions — no side effects
2. Immutability
3. First-class functions
4. Function composition

** Haskell Example

#+BEGIN_SRC haskell
fib :: Int -> Int
fib 0 = 0
fib 1 = 1
fib n = fib (n-1) + fib (n-2)
#+END_SRC`,
		backlinks: [{ source: "math-number-theory", title: "Number Theory" }],
	},

	"prog-emacs-lisp": {
		id: "prog-emacs-lisp",
		title: "Emacs Lisp",
		raw: `* Emacs Lisp

Scripting language for GNU Emacs.

** Basics

#+BEGIN_SRC emacs-lisp
(defun greet (name)
  "Greet NAME."
  (message "Hello, %s!" name))
#+END_SRC

** Hooks

#+BEGIN_SRC emacs-lisp
(add-hook 'after-save-hook #'my-save-hook)
#+END_SRC`,
		backlinks: [
			{ source: "prog-data-structures", title: "Data Structures" },
			{ source: "proj-notes-method", title: "Notes Methodology" },
		],
	},

	"prog-typescript": {
		id: "prog-typescript",
		title: "TypeScript",
		raw: `* TypeScript

Strongly typed JavaScript superset.

** Generics

#+BEGIN_SRC typescript
function identity<T>(arg: T): T {
  return arg;
}
type Nullable<T> = T | null;
#+END_SRC

** Utility Types

- ~Partial<T>~ — all properties optional
- ~Required<T>~ — all properties required
- ~Readonly<T>~ — all properties readonly`,
		backlinks: [{ source: "prog-functional", title: "Functional Programming" }],
	},

	"sci-biology": {
		id: "sci-biology",
		title: "Biology",
		raw: `* Biology

The scientific study of life and living organisms.

** Cell Theory

1. All organisms are made of cells
2. The cell is the basic unit of life
3. All cells arise from pre-existing cells

** DNA

Watson-Crick base pairing: A-T, G-C

#+BEGIN_EXAMPLE
5'-ATCGTAGCTA-3'
3'-TAGCATCGAT-5'
#+END_EXAMPLE`,
		backlinks: [
			{ source: "math-statistics", title: "Statistics" },
			{ source: "sci-chemistry", title: "Chemistry" },
		],
	},

	"sci-chemistry": {
		id: "sci-chemistry",
		title: "Chemistry",
		raw: `* Chemistry

The study of matter and its properties.

** Chemical Bonds

- Ionic: electron transfer (NaCl)
- Covalent: electron sharing (H₂O)
- Metallic: delocalized electrons

** Reaction Types

| Type         | Pattern            |
|--------------|--------------------|
| Synthesis    | A + B → AB         |
| Decomposition| AB → A + B         |
| Combustion   | fuel + O₂ → CO₂ + H₂O |`,
		backlinks: [],
	},

	"sci-physics": {
		id: "sci-physics",
		title: "Physics",
		raw: `* Physics

Fundamental laws governing the universe.

** Newton's Laws

1. Inertia: objects at rest remain at rest
2. $F = ma$
3. Equal and opposite reactions

** Thermodynamics

- First law: $\\Delta U = Q - W$
- Second law: entropy never decreases in isolation`,
		backlinks: [
			{ source: "math-calculus", title: "Calculus" },
			{ source: "proj-index", title: "Index" },
		],
	},

	"sci-astronomy": {
		id: "sci-astronomy",
		title: "Astronomy",
		raw: `* Astronomy

The study of celestial objects and the universe.

** Stellar Evolution

#+BEGIN_EXAMPLE
Nebula → Protostar → Main Sequence →
  (low mass)  White Dwarf
  (high mass) Neutron Star / Black Hole
#+END_EXAMPLE

** Cosmology

Universe age: ~13.8 billion years
Composition: 5% matter, 27% dark matter, 68% dark energy`,
		backlinks: [
			{ source: "sci-physics", title: "Physics" },
			{ source: "proj-reading-list", title: "Reading List" },
		],
	},

	"sci-neuroscience": {
		id: "sci-neuroscience",
		title: "Neuroscience",
		raw: `* Neuroscience

The scientific study of the nervous system.

** Neural Communication

1. Action potential propagates along axon
2. Neurotransmitters released at synapse
3. Post-synaptic receptors bind transmitters

** Brain Regions

| Region            | Function         |
|-------------------|------------------|
| Prefrontal cortex | Executive function |
| Hippocampus       | Memory           |
| Amygdala          | Emotions         |`,
		backlinks: [{ source: "sci-biology", title: "Biology" }],
	},

	"phil-epistemology": {
		id: "phil-epistemology",
		title: "Epistemology",
		raw: `* Epistemology

The theory of knowledge.

** Justified True Belief

Plato: knowledge = justified true belief.
Gettier (1963) showed JTB is insufficient.

** Sources of Knowledge

- *Rationalism*: from reason (Descartes)
- *Empiricism*: from experience (Hume)
- *Kant*: synthesis of both`,
		backlinks: [{ source: "phil-logic", title: "Logic" }],
	},

	"phil-ethics": {
		id: "phil-ethics",
		title: "Ethics",
		raw: `* Ethics

The study of moral principles.

** Major Theories

*** Consequentialism
Right actions maximize good outcomes (Utilitarianism).

*** Deontology
Actions are intrinsically right/wrong (Kant's categorical imperative).

*** Virtue Ethics
Focus on character — Aristotle's eudaimonia.`,
		backlinks: [{ source: "proj-reading-list", title: "Reading List" }],
	},

	"phil-logic": {
		id: "phil-logic",
		title: "Logic",
		raw: `* Logic

The study of valid reasoning.

** Propositional Connectives

- $\\neg p$ — negation
- $p \\land q$ — and
- $p \\lor q$ — or
- $p \\to q$ — implies

** Modus Ponens

$\\dfrac{p,\\quad p \\to q}{q}$

** Predicate Logic

$\\forall x\\,(P(x) \\to Q(x))$`,
		backlinks: [{ source: "proj-index", title: "Index" }],
	},

	"phil-metaphysics": {
		id: "phil-metaphysics",
		title: "Metaphysics",
		raw: `* Metaphysics

The nature of reality.

** Ontology

- *Monism*: one fundamental substance
- *Dualism*: mind and matter are distinct
- *Pluralism*: multiple substances

** Causality

Hume: causation as constant conjunction — cause precedes and is contiguous with effect.`,
		backlinks: [
			{ source: "math-topology", title: "Topology" },
			{ source: "phil-epistemology", title: "Epistemology" },
		],
	},

	"phil-mind": {
		id: "phil-mind",
		title: "Philosophy of Mind",
		raw: `* Philosophy of Mind

The nature of mental phenomena.

** The Hard Problem

Why does physical processing give rise to subjective experience? (Chalmers)

** Theories

- *Physicalism*: mental states are physical states
- *Dualism*: mental ≠ physical (Descartes)
- *Functionalism*: mind as computational process

** Qualia

The subjective character of experience — "what it's like" to see red.`,
		backlinks: [
			{ source: "sci-neuroscience", title: "Neuroscience" },
			{ source: "phil-ethics", title: "Ethics" },
		],
	},

	"hist-ancient": {
		id: "hist-ancient",
		title: "Ancient History",
		raw: `* Ancient History

From the beginning of recorded history to 476 CE.

** Major Civilizations

| Civilization | Period         |
|--------------|----------------|
| Mesopotamia  | 3500–539 BCE   |
| Egypt        | 3100–30 BCE    |
| Greece       | 800–146 BCE    |
| Rome         | 753 BCE–476 CE |

** Greek Philosophy

Socrates → Plato → Aristotle shaped Western thought.`,
		backlinks: [],
	},

	"hist-medieval": {
		id: "hist-medieval",
		title: "Medieval History",
		raw: `* Medieval History

From the fall of Rome (476 CE) to ~1500 CE.

** Feudal System

#+BEGIN_EXAMPLE
King → Nobles → Knights → Serfs
#+END_EXAMPLE

** Key Events

- Crusades (1096–1291)
- Magna Carta (1215)
- Black Death (1347–1351): killed 30–60% of Europe`,
		backlinks: [{ source: "hist-ancient", title: "Ancient History" }],
	},

	"hist-modern": {
		id: "hist-modern",
		title: "Modern History",
		raw: `* Modern History

From the Renaissance to the present.

** The Enlightenment

Key ideas: reason, individual rights, scientific method.

** Major Revolutions

- American (1775–1783)
- French (1789–1799)
- Industrial (c. 1760–1840)

** 20th Century

- WWI (1914–18), WWII (1939–45)
- Cold War (1947–1991)`,
		backlinks: [
			{ source: "hist-medieval", title: "Medieval History" },
			{ source: "proj-index", title: "Index" },
		],
	},

	"hist-science": {
		id: "hist-science",
		title: "History of Science",
		raw: `* History of Science

Development of scientific knowledge.

** Scientific Revolution (1543–1687)

- Copernicus: heliocentric model
- Galileo: experimental method
- Newton: laws of motion

** 19th Century

- Darwin: natural selection (1859)
- Maxwell: electromagnetism
- Mendeleev: periodic table (1869)`,
		backlinks: [{ source: "proj-reading-list", title: "Reading List" }],
	},

	"hist-technology": {
		id: "hist-technology",
		title: "History of Technology",
		raw: `* History of Technology

Human innovation from prehistory to the present.

** Computing Milestones

#+BEGIN_EXAMPLE
1830s  Babbage's Analytical Engine
1940s  ENIAC — first electronic computer
1970s  Microprocessors, personal computers
1989   World Wide Web
2007   Smartphones
#+END_EXAMPLE`,
		backlinks: [{ source: "hist-science", title: "History of Science" }],
	},

	"proj-index": {
		id: "proj-index",
		title: "Index",
		raw: `* Index

My personal knowledge base hub.

** Mathematics
- [[id:math-linear-algebra][Linear Algebra]]

** Programming
- [[id:prog-algorithms][Algorithms]]

** Science
- [[id:sci-physics][Physics]]

** Philosophy
- [[id:phil-logic][Logic]]

** History
- [[id:hist-modern][Modern History]]`,
		backlinks: [{ source: "proj-notes-method", title: "Notes Methodology" }],
	},

	"proj-emacs-setup": {
		id: "proj-emacs-setup",
		title: "Emacs Setup",
		raw: `* Emacs Setup

Personal Emacs configuration.

** Core Packages

#+BEGIN_SRC emacs-lisp
(use-package org-node
  :config (org-node-cache-mode 1))

(use-package org-node-ui-lite
  :after org-node)
#+END_SRC

** Key Bindings

| Key     | Command              |
|---------|----------------------|
| C-c n f | org-node-find        |
| C-c n u | org-node-ui-lite-mode |`,
		backlinks: [{ source: "prog-emacs-lisp", title: "Emacs Lisp" }],
	},

	"proj-reading-list": {
		id: "proj-reading-list",
		title: "Reading List",
		raw: `* Reading List

** Mathematics
- [ ] /Gödel, Escher, Bach/ — Hofstadter
- [X] /A Mathematician's Apology/ — Hardy

** Science
- [ ] /A Brief History of Time/ — Hawking
- [ ] /The Selfish Gene/ — Dawkins

** Philosophy
- [X] /Meditations/ — Marcus Aurelius
- [ ] /Being and Time/ — Heidegger

** Technology
- [X] /The Pragmatic Programmer/ — Hunt & Thomas`,
		backlinks: [],
	},

	"proj-notes-method": {
		id: "proj-notes-method",
		title: "Notes Methodology",
		raw: `* Notes Methodology

How I organize notes.

** Principles

1. *Atomic notes*: one concept per note
2. *Link liberally*: use [[id:prog-emacs-lisp][org-id links]]
3. *Write in own words*
4. *Review regularly*

** Workflow

#+BEGIN_EXAMPLE
Capture → Process → Connect → Review
#+END_EXAMPLE

Reference hub: [[id:proj-index][Index]]`,
		backlinks: [{ source: "proj-daily-log", title: "Daily Log" }],
	},

	"proj-daily-log": {
		id: "proj-daily-log",
		title: "Daily Log",
		raw: `* Daily Log

** 2024-01

*** 2024-01-15

- Studied [[id:math-linear-algebra][Linear Algebra]] eigendecomposition
- Reviewed [[id:prog-algorithms][sorting algorithms]]

*** 2024-01-16

- Read SICP chapter 3
- Practiced [[id:prog-emacs-lisp][Emacs Lisp]] macros

** 2024-02

*** 2024-02-01

- Explored [[id:sci-neuroscience][Neuroscience]] connections to [[id:phil-mind][philosophy of mind]]`,
		backlinks: [],
	},
};

export const SAMPLE_NODE_IDS = SAMPLE_NODE_SUMMARIES.map((n) => n.id);
