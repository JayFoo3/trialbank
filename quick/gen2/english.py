"""English Advanced and Standard (Common Module: Texts and Human Experiences, unseen texts).
All extracts are original, written for Trialbank."""
from lib import Bank
import copy
T = 'Common Module: Unseen Texts'
b = Bank('quick-engadv', 'eng', typed=True, seed=81)
M, W = b.M, b.W
q = lambda s: f'<i>“{s}”</i>'
TECH = [
    ('The wind whispered secrets through the empty hall.', 'Personification', ['Simile', 'Hyperbole', 'Alliteration'], 'The wind is given a human action (whispering).'),
    ('Her laugh was a bright bell in the quiet room.', 'Metaphor', ['Simile', 'Onomatopoeia', 'Oxymoron'], 'A direct comparison without “like” or “as”.'),
    ('He moved like a shadow through the crowd.', 'Simile', ['Metaphor', 'Personification', 'Juxtaposition'], 'Comparison using “like”.'),
    ('I have told you a million times.', 'Hyperbole', ['Understatement', 'Irony', 'Repetition'], 'Deliberate exaggeration.'),
    ('Silent, slow and sorrowful, the soldiers stepped forward.', 'Alliteration', ['Assonance', 'Sibilance only', 'Anaphora'], 'Repeated initial consonant sound “s”.'),
    ('The crash of the waves, the hiss of the foam.', 'Onomatopoeia', ['Metaphor', 'Personification', 'Simile'], '“Crash” and “hiss” imitate the sounds.'),
    ('It was a deafening silence.', 'Oxymoron', ['Paradox', 'Hyperbole', 'Simile'], 'Two contradictory words placed together.'),
    ('We waited. We hoped. We wept.', 'Anaphora / repetition', ['Alliteration', 'Juxtaposition', 'Enjambment'], 'Repetition of “We” at the start of each sentence builds intensity.'),
    ('The mansion glittered on the hill; below, the shanties sank into the mud.', 'Juxtaposition', ['Simile', 'Personification', 'Onomatopoeia'], 'Two contrasting images placed side by side.'),
    ('“Lovely weather,” she muttered, as the rain soaked through her coat.', 'Verbal irony', ['Dramatic irony', 'Hyperbole', 'Pathetic fallacy'], 'She says the opposite of what she means.'),
    ('As she buried her father, the sky wept grey rain.', 'Pathetic fallacy', ['Simile', 'Hyperbole', 'Irony'], 'The weather reflects human emotion.'),
    ('Isn’t it time we listened?', 'Rhetorical question', ['Imperative', 'Hyperbole', 'Ellipsis'], 'A question asked for effect, not an answer.'),
    ('Stop. Look. Listen.', 'Imperative voice / short sentences', ['Rhetorical question', 'Simile', 'Metaphor'], 'Commands that create urgency.'),
    ('The old key, rusted and heavy, still opened the door to his childhood.', 'Symbolism', ['Onomatopoeia', 'Oxymoron', 'Hyperbole'], 'The key stands for access to memory.'),
    ('I wandered the streets of my memory, every corner a door.', 'Extended metaphor', ['Simile', 'Personification', 'Onomatopoeia'], 'Memory is developed as a city with streets and doors.'),
    ('It was only a small fire, the house merely burnt to the ground.', 'Understatement', ['Hyperbole', 'Simile', 'Alliteration'], 'Deliberately downplays something serious.'),
    ('I — I can’t... I won’t go back.', 'Ellipsis and fragmented syntax', ['Hyperbole', 'Metaphor', 'Juxtaposition'], 'Broken speech shows hesitation and distress.'),
    ('You walk in. You smell the dust. You know you are home.', 'Second-person address', ['First-person narration', 'Third-person omniscient', 'Dialogue'], '“You” draws the reader into the experience.'),
    ('The cold creeps, the dark deepens, the hours drag.', 'Tricolon (rule of three)', ['Oxymoron', 'Simile', 'Hyperbole'], 'Three parallel phrases build rhythm.'),
    ('The light of the moon, soft and low, rolled over the slow, cold stones.', 'Assonance', ['Alliteration', 'Onomatopoeia', 'Sibilance'], 'Repeated long “o” vowel sounds slow the line.'),
]
for line, right, wrong, why in TECH:
    M(T, f'Which technique is most clearly used in {q(line)}?', right, wrong, why)
M(T, 'In a text about human experiences, a "paradox" of human behaviour is', 'when people act in ways that seem contradictory', ['when people always behave rationally', 'a type of rhyme', 'a happy ending'], 'e.g. people seeking safety by taking risks.')
M(T, 'An "anomaly" of human behaviour means behaviour that', 'departs from what is expected or normal', ['always repeats', 'is shared by everyone', 'is described in the first person'], 'The Common Module asks about anomalies, paradoxes and inconsistencies.')
M(T, 'A first-person narrator mainly allows a composer to', 'show a character\'s inner thoughts and feelings directly', ['know everything about all characters', 'remain completely objective', 'avoid emotion'], 'It creates intimacy and subjectivity.')
M(T, 'A high-angle shot in a film or image tends to make the subject seem', 'vulnerable or small', ['powerful', 'distant in time', 'unrelated'], 'The viewer looks down on the subject.')
M(T, 'Salience in a visual text refers to', 'the element that draws the viewer\'s eye first', ['the colour palette only', 'the title', 'the use of words'], 'Created through size, colour, contrast or placement.')
M(T, 'A good thesis for a Common Module response should', 'make an arguable claim about how the text represents human experience', ['summarise the plot', 'list techniques', 'give the author\'s biography'], 'It answers the question directly.')

EX = [
    ('The house was quiet now. On the table, his mug still sat where he had left it, a ring of cold tea at the bottom. She did not wash it.',
     2, 'Explain how the composer represents grief in this extract.', ['Symbolism: the untouched mug represents the absent man and her refusal to let him go.', 'The short sentence "She did not wash it." and the quiet setting show grief through restraint and stillness rather than open emotion.'],
     [('Explains how one or more techniques represent grief, with reference to the extract', 2), ('Identifies a technique or describes grief', 1)]),
    ('Every morning the boy ran to the fence to watch the trains, counting carriages, naming cities he had never seen. Every evening, he walked home slower.',
     2, 'How does the extract convey a desire to escape?', ['The repetition of "Every morning ... Every evening" shows a daily ritual of longing.', 'Listing ("counting carriages, naming cities") shows his imagination reaching outward, while "walked home slower" shows reluctance to return to his ordinary life.'],
     [('Explains how techniques convey the desire to escape, with reference to the extract', 2), ('Identifies a relevant technique or idea', 1)]),
    ('We were promised a new country. We were given a tin hut, a dust road and a sky so wide it swallowed our voices.',
     3, 'Explain how the extract represents the gap between expectation and reality in the migrant experience.', ['Juxtaposition of "promised a new country" with "given a tin hut" exposes the gap between hope and harsh reality.', 'Collective first person "We" makes it a shared experience of a community.', 'The hyperbolic metaphor "a sky so wide it swallowed our voices" conveys isolation and powerlessness in the vast new landscape.'],
     [('Explains how several techniques represent the gap between expectation and reality, with well-chosen references', 3), ('Explains one technique with reference', 2), ('Identifies a relevant technique or idea', 1)]),
    ('Grandma\'s hands were maps: rivers of veins, the hills of her knuckles, a scar where she once caught a falling pot to save my mother.',
     3, 'How does the composer use imagery to represent memory and family?', ['The extended metaphor of hands as "maps" suggests her body records her life story.', 'Natural imagery ("rivers", "hills") makes her history seem vast and enduring.', 'The anecdote of the scar links her body to an act of protective love, showing how family memory is passed down.'],
     [('Explains how imagery represents memory and family with detailed references', 3), ('Explains imagery with some reference', 2), ('Identifies imagery or an idea', 1)]),
    ('He told everyone he was fine. He bought a new car, laughed loudly at parties, posted photos from the beach. At night, he sat in the car in the garage, engine off, and did not go inside.',
     3, 'Explain how the extract represents an inconsistency in human behaviour.', ['The contrast between the public image (listing of the car, parties, photos) and the private scene at night reveals the gap between how he appears and how he feels.', 'The short declarative "He told everyone he was fine" is undercut by the final sentence, creating irony.', 'The image of sitting in the car without going inside suggests emotional paralysis and isolation, showing how people hide pain.'],
     [('Explains how techniques represent the inconsistency with detailed references', 3), ('Explains one technique with reference', 2), ('Identifies the inconsistency', 1)]),
]
for ext, mk, prompt, lines, crit in EX:
    W(T, mk, f'Read the extract: {q(ext)} {prompt}', lines, crit)
EXT = [
    ('The storm took the roof first, then the fences, then the photographs. In the morning the neighbours came, all of them, with hammers and casseroles and nothing to say. Mrs Okafor, who had not spoken to anyone in the street for nine years, held my mother\'s hand for an hour.',
     'Analyse how the extract represents the ways shared experiences can bring people together.'),
    ('On the first day of school, I learned my name was wrong. The teacher frowned, tried twice, then gave me a new one, easier, shorter, like a coat that didn\'t fit. I wore it for twelve years. I am taking it off now.',
     'Analyse how the extract represents the relationship between identity and human experience.'),
    ('My father fixed everything. Clocks, toasters, the neighbours\' bikes. The only thing he couldn\'t fix was the silence at our dinner table, so he fixed the clock again, and again, until it ran perfectly and nobody spoke.',
     'Analyse how the extract represents a paradox of human behaviour.'),
]
for ext, prompt in EXT:
    W(T, 5, f'Read the extract: {q(ext)} {prompt}', ['A clear thesis that answers the question about the human experience represented.', 'Analysis of at least three techniques (e.g. listing, symbolism, juxtaposition, structure, narrative voice, irony) with quotations from the extract.', 'Explains how each technique shapes meaning about the human experience, not just naming it.', 'A coherent, well-structured response using the language of the question.'],
     [('Insightful thesis; sophisticated analysis of how several well-chosen techniques represent the experience; well-structured', 5), ('Clear thesis; effective analysis of several techniques with relevant references', 4), ('Sound explanation of some techniques with references', 3), ('Describes the experience with some reference to techniques', 2), ('General or limited response', 1)])
b.save()
std = Bank('quick-engstd', 'eng', typed=True, seed=81)
std.mcq, std.worked = copy.deepcopy(b.mcq), []
import json, os
from lib import OUT
std.save()
# worked: copy the finished file so Standard gets the same set
src = os.path.join(OUT, 'quick-engadv-worked.raw.json'); json.dump(json.load(open(src)), open(os.path.join(OUT, 'quick-engstd-worked.raw.json'), 'w'), ensure_ascii=False)
