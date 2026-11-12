/* poems.js - the prescribed poems for English: a guide to each poem, a quote bank with recall practice,
   quick checks marked on the spot, and a step-by-step paragraph writer. Shown under Poems for English Standard and Advanced.
   No poem text lives in this file (the poems are in copyright): each evidence row says what to find in the
   student's own copy, and the quote they type in is kept on their device and reused by the drill and the model paragraph.
   To add a collection, add an entry to SETS in the same shape. */
(function () {
  'use strict';
  const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // each idea: [name, claim, link to the module, [[what to find, technique, effect], ...]]
  // each check: [question, [options], index of the right one, why]
  const SETS = [{
    id: 'watson', poet: 'Samuel Wagan Watson', title: 'Love Poems and Death Threats', year: 2014,
    module: 'Common Module: Texts and Human Experiences', subjects: ['EngStd', 'EngAdv'],
    poetFacts: ['Born in Brisbane in 1972', 'Munanjali and Birri Gubba heritage', 'Son of activist and writer Sam Watson', 'Writes the city: suburbs, highways, the river, the news'],
    threads: [
      ['Hope and resilience', 'Hope in Watson is small and unfinished. It turns up as a change in how someone sees, not as a problem solved.', ['remedy', 'finn', 'addendum']],
      ['Identity and belonging', 'Identity is something his speakers have to keep arguing for, in a language and a landscape that were laid over Country.', ['blacktracker', 'eldiablo', 'letstalk']],
      ['Power and injustice', 'Institutions that promise fairness (courts, roads, markets) are shown deciding whose life counts.', ['letstalk', 'eldiablo', 'endofdays']],
      ['Connection', 'People reach for each other hardest when things fall apart, and the reaching is never tidy.', ['finn', 'addendum', 'remedy']],
      ['Paradox in how people behave', 'Love sits beside threat, solidarity beside self-interest, protest beside complicity.', ['finn', 'endofdays', 'eldiablo', 'addendum']],
      ['Individual and collective experience', 'A single voice keeps widening into "we", so private feeling becomes a shared history.', ['finn', 'letstalk', 'blacktracker']],
    ],
    motif: 'Butterflies return in The Remedy of Butterflies, End of Days and Addendum. Tracking what they mean each time is an easy way to link three poems in one essay.',
    questions: [
      'How does Watson\'s poetry represent the paradoxes in human behaviour and motivation? Refer to at least two poems.',
      'To what extent do the prescribed poems suggest that shared experiences matter more than individual ones?',
      'Watson invites readers to see the world differently. How does his poetry challenge assumptions about contemporary Australian life?',
      'Explore how Watson uses storytelling to give voice to experiences that are often ignored.',
      '"Hope is found in the smallest places." Evaluate this view of Watson\'s poetry.',
      'How do the form and language of Watson\'s poems shape your understanding of resilience?',
    ],
    poems: [
      {
        id: 'remedy', title: 'The Remedy of Butterflies', gist: 'A frozen suburb, two butterflies, and the view changes.',
        about: 'The speaker looks out on a cold, lifeless suburb and reads it like a body shutting down. Two butterflies cross the scene and the same place starts to look possible. Nothing is fixed by the end. Only the way of seeing has moved.',
        form: ['Free verse built around a refrain about stillness', 'A clear turn when the butterflies arrive', 'The refrain comes back reversed', 'Ends unfinished, so the hope is partial'],
        tone: 'Bleak and clinical, then lighter and vivid',
        ideas: [
          ['Hardship can feel permanent', 'When you are worn down, a bad season looks like the way things will always be.', 'Shows how emotion shapes what a person takes to be true about their world.', [
            ['The line about stillness that keeps coming back', 'Refrain', 'Repeating it locks the scene in place, so the cold reads as permanent rather than passing.'],
            ['Cold described the way a doctor would describe a failing body', 'Medical imagery, personification', 'The suburb becomes a patient, and weather turns into a diagnosis.'],
            ['Ghost-like sound in the empty streets', 'Auditory imagery', 'The place feels haunted before anything has died, so dread arrives early.'],
          ]],
          ['Routine drains feeling', 'Suburban life and its pressures leave the speaker too tired to be moved.', 'An experience of disconnection that many readers will recognise as their own.', [
            ['Wry, everyday wording about the suburb', 'Colloquial language, irony', 'The joke is flat on purpose. It is the humour of someone running on empty.'],
            ['Scientific word choices where you expect feeling', 'Clinical tone', 'Detachment is what emotional exhaustion sounds like.'],
          ]],
          ['Small things restore possibility', 'Renewal starts with noticing something slight, and it stays incomplete.', 'An anomaly: the least powerful thing in the scene causes the biggest change.', [
            ['The moment the two butterflies enter', 'Volta', 'The poem pivots here. The suburb is the same, the reading of it is new.'],
            ['Colour and movement after the turn', 'Kinetic and colour imagery', 'Motion breaks the frozen palette, and two butterflies together suggest company.'],
            ['Life starting up from small wings', 'Metaphor', 'Fragility is given the power. Energy comes from the delicate thing.'],
            ['The refrain reversed, and the last line left open', 'Reversal, open ending', 'Stillness gives way to movement, yet nothing is resolved. Hope is a start, not a cure.'],
          ]],
        ],
        para: 'Watson suggests that renewal begins with a shift in perception rather than a change in circumstance. The poem first traps its speaker in stillness through a refrain, {0.0}, and the medical imagery of {0.1} turns an ordinary cold suburb into a body close to death, revealing how hardship can make a temporary state feel final. This certainty is disrupted at the volta, when the butterflies arrive and kinetic imagery such as {2.1} replaces the frozen scene. The metaphor in {2.2} places energy in something fragile, an anomaly that challenges the assumption that only large events can transform us. Yet the reversed refrain and unfinished ending refuse a neat recovery. Watson therefore represents resilience as an incomplete, ongoing human experience: possibility found inside difficulty, not after it.',
        questions: [
          'How does Watson explore the power of small moments to change the way an individual sees the world?',
          'To what extent does The Remedy of Butterflies suggest that hope depends on perspective?',
          'How does the structure of the poem shape your understanding of renewal?',
          'Analyse how Watson represents emotional exhaustion as a human experience.',
          '"Nothing changes in the poem except the speaker." Do you agree?',
        ],
        checks: [
          ['What actually changes at the turn of the poem?', ['The weather warms up', 'The speaker leaves the suburb', 'The way the speaker sees the same place', 'The butterflies die'], 2, 'The suburb stays as it was. The shift is in perception, which is the point of the poem.'],
          ['Describing the cold suburb in a doctor\'s language is best labelled as', ['Medical imagery that personifies the landscape', 'Onomatopoeia', 'Dramatic irony', 'Allusion'], 0, 'The place is treated as a failing body, so it is imagery and personification working together.'],
          ['Why does the refrain matter when it returns late in the poem?', ['It proves nothing has changed', 'It is reversed, marking the move from stillness to movement', 'It introduces a new speaker', 'It rhymes for the first time'], 1, 'A refrain that comes back changed shows the reader exactly what has shifted.'],
          ['The unfinished ending suggests that', ['the poet ran out of ideas', 'the speaker has fully recovered', 'renewal is partial and still under way', 'the butterflies were imagined'], 2, 'Leaving it open stops the poem from claiming a cure.'],
          ['Which rubric term best fits the butterflies causing such a large change?', ['Anomaly', 'Collective experience', 'Context', 'Representation of culture'], 0, 'The smallest, weakest thing has the biggest effect, which runs against expectation.'],
          ['Which thesis is strongest for a question on resilience?', ['Watson shows butterflies are beautiful', 'Watson shows resilience as finding possibility within hardship, not escaping it', 'Watson shows suburbs are boring', 'Watson shows winter always ends'], 1, 'It makes an argument about the experience and matches the unresolved ending.'],
        ],
      },
      {
        id: 'finn', title: 'Finn', gist: 'A river turns on the people who live beside it.',
        about: 'A river becomes a destructive force and a riverside community has to face it together. The speaker talks as "we": neighbours pulled closer, and sometimes apart, by disaster. The title borrows Mark Twain\'s Huckleberry Finn, whose river meant freedom. Here the river is danger and invitation at once.',
        alt: 'Another reading: the shared river journey, echoing Huck and Jim, as an image of allyship and the slow work of reconciliation.',
        form: ['Free verse', 'The river is personified from start to finish', 'Metaphors keep shifting, like the water', 'Ends on an ambiguous invitation that names Huckleberry'],
        tone: 'Foreboding, then solidarity, then scepticism',
        ideas: [
          ['Disaster and the limits of control', 'The flood exposes how little say people have over the natural world.', 'Challenges the assumption that modern life has made us safe.', [
            ['The river behaving like a living, wilful thing', 'Sustained personification', 'Giving the river intent makes it an opponent, and people become the ones acted upon.'],
            ['End-of-the-world pictures of the water', 'Apocalyptic imagery', 'A local flood is scaled up to something biblical, so vulnerability feels total.'],
            ['A calm, played-down phrase about something terrible', 'Understatement', 'The quiet wording is how people talk when the event is too big to describe.'],
          ]],
          ['Solidarity under pressure', 'Crisis draws people together, but self-interest never fully leaves.', 'A paradox in human behaviour: generosity and selfishness in the same moment.', [
            ['"We" and "our" carrying the poem', 'Collective pronouns', 'The individual voice dissolves into a community. The experience is shared.'],
            ['Kindness shown right beside people looking after themselves', 'Paradox', 'Watson refuses a simple story of heroic neighbours.'],
            ['An everyday Australian saying', 'Colloquial idiom', 'Ordinary speech keeps the scene local and believable, and a little wry.'],
          ]],
          ['Security is fragile', 'The things people rely on, from buildings to guarantees, turn out not to hold.', 'Uncertainty reshapes how a person understands themselves and their place.', [
            ['Something built to protect that fails', 'Architectural metaphor, irony', 'The structure meant to keep people safe is the thing that gives way.'],
            ['Life before set against life after', 'Temporal contrast', 'The flood becomes a dividing line in identity.'],
            ['The closing invitation that names Huckleberry', 'Intertextual allusion', 'Twain\'s river of freedom is borrowed for a river of threat. The ending is open: escape, companionship, or a dare.'],
          ]],
        ],
        para: 'In Finn, Watson represents adversity as an experience that exposes the limits of human control while drawing people into uneasy solidarity. The sustained personification of the river, {0.0}, gives nature intent, reducing the community to those acted upon, and the apocalyptic imagery of {0.1} enlarges a local flood into total vulnerability. Against this, the collective pronouns in {1.0} merge individual voices into a shared one, suggesting that crisis creates connection. Watson complicates that comfort through paradox, {1.1}, admitting that self-interest survives beside generosity. The closing allusion to Twain, {2.2}, leaves the reader with an ambiguous invitation rather than a rescue. The poem therefore challenges the assumption that resilience brings lasting security, presenting it instead as a fragile, collective human response.',
        questions: [
          'How does Watson represent the way shared adversity transforms relationships in Finn?',
          'To what extent does Finn challenge the belief that people control their circumstances?',
          'How does Watson use the river to explore both individual and collective human experiences?',
          'Analyse how the allusion to Huckleberry Finn shapes meaning in the poem.',
          '"Disaster shows people at their best and their worst." Discuss with reference to Finn.',
        ],
        checks: [
          ['Who speaks in Finn?', ['A single child', 'A collective "we"', 'The river itself', 'Mark Twain'], 1, 'The plural voice makes the experience a community\'s, not one person\'s.'],
          ['The title alludes to', ['an Irish folk hero', 'a Brisbane suburb', 'Mark Twain\'s Huckleberry Finn', 'a type of fish'], 2, 'Twain\'s novel is a river journey, and the poem ends by naming Huckleberry.'],
          ['Treating the river as a wilful living thing across the whole poem is', ['sustained personification', 'a simile', 'assonance', 'a rhetorical question'], 0, 'It is personification, and because it runs throughout it is sustained.'],
          ['Which idea is a paradox in the poem?', ['Rivers flow downhill', 'Crisis produces both solidarity and self-interest', 'Floods are wet', 'Twain was American'], 1, 'Two opposite behaviours appear together, which is what the rubric means by paradox.'],
          ['The ending is best described as', ['a clear rescue', 'a moral lesson', 'an ambiguous invitation', 'a list of the dead'], 2, 'It can be read as escape, company or a dare, and Watson does not settle it.'],
          ['What does the poem suggest about resilience?', ['It guarantees safety', 'It is only for individuals', 'It is pointless', 'It is real but does not make security last'], 3, 'People pull through together, yet what they rely on stays fragile.'],
        ],
      },
      {
        id: 'letstalk', title: "Let's Talk!", gist: 'A demand for an honest conversation about racism.',
        about: 'The speaker keeps calling for talk about racism toward First Nations people while showing how badly the talking has gone so far. Courts, universities and political speech are all in the firing line. So is the urge to answer violence with violence. Part of it is spoken straight to a "brother".',
        form: ['Free verse', 'The title phrase repeats as a command', 'Images jump quickly from one to the next', 'Fire cools from flames to embers by the end'],
        tone: 'Confronting, satirical, urgent',
        ideas: [
          ['Whose suffering counts', 'Pain is valued differently depending on who feels it, and institutions keep the scale.', 'Represents a collective experience of injustice that official stories leave out.', [
            ['Two kinds of suffering placed side by side', 'Juxtaposition', 'The contrast makes the unequal response impossible to miss.'],
            ['The courtroom and the count of dead children', 'Hyperbole, statistics', 'Numbers turn grief into evidence and put the justice system on trial.'],
            ['People reduced to skin, studied in libraries', 'Metonymy, academic diction, irony', 'The language of research is shown treating a people as specimens.'],
          ]],
          ['Violence feeds itself', 'Culture and hope are under attack, and striking back only extends the damage.', 'An inconsistency in human motivation: the wish for justice sliding into the wish for revenge.', [
            ['Dreams treated as targets, then as ashes', 'Metaphor, violent imagery', 'Hopes are destroyed for sport, then destroyed completely.'],
            ['The word "brother"', 'Direct address', 'The speaker turns to his own side. Responsibility is not only the oppressor\'s.'],
            ['Bravery and cowardice jammed into one phrase', 'War metaphor, oxymoron', 'So-called courage is exposed as empty.'],
          ]],
          ['Talk is flawed and still necessary', 'Reconciliation is work that keeps going, not a speech.', 'Invites the reader to reconsider their own part in the conversation.', [
            ['The title phrase starting line after line', 'Anaphora, imperative', 'Insistence becomes pressure. The reader is being told, not asked.'],
            ['Mimicry of official reconciliation language', 'Satire', 'Hollow talk is mocked so that real talk can be told apart from it.'],
            ['Fire dying down to embers at the close', 'Fire imagery', 'Heat that destroyed becomes warmth people can sit around.'],
          ]],
        ],
        para: 'Watson presents dialogue as a flawed but necessary response to a collective experience of injustice. Through juxtaposition, {0.0}, he exposes how suffering is valued unequally, and the reference to {0.1} turns grief into evidence against the institutions meant to deliver fairness. The anaphora of the title phrase, with its imperative mood, presses the reader to take part rather than observe. Yet the poem does not excuse its own community: the direct address in {1.1} and the oxymoron in {1.2} reject violence as an answer, revealing an inconsistency between the desire for justice and the pull of revenge. As fire imagery cools in {2.2}, destruction gives way to the possibility of connection. Watson thereby challenges readers to see reconciliation as shared, continuing responsibility.',
        questions: [
          'How does Watson represent the effects of injustice on both individuals and communities in Let\'s Talk!?',
          'To what extent does the poem argue that change requires people to break familiar patterns of behaviour?',
          'How do repetition and direct address shape your response to Let\'s Talk!?',
          'Analyse how Watson uses satire to challenge assumptions about reconciliation.',
          '"The poem asks more of its reader than agreement." Discuss.',
        ],
        checks: [
          ['Repeating the title phrase at the start of successive lines is', ['anaphora', 'enjambment', 'sibilance', 'pathetic fallacy'], 0, 'Anaphora is repetition at the start of lines or clauses.'],
          ['The word "brother" matters because it', ['shows the speaker is religious', 'turns the speaker toward his own community', 'names the poet\'s sibling', 'is a rhyme word'], 1, 'Direct address brings responsibility home rather than leaving it all with the oppressor.'],
          ['What is the poem\'s attitude to official reconciliation talk?', ['Grateful', 'Indifferent', 'Satirical: it mocks talk that changes nothing', 'Confused'], 2, 'The poem mimics empty language so that honest dialogue stands out.'],
          ['The shift from flames to embers suggests', ['the fight is lost', 'a move from destruction toward something people can gather around', 'the poem is set at night', 'anger is always wrong'], 1, 'The same element changes from threat to warmth.'],
          ['Which institutions does the poem put under pressure?', ['Courts and academic study', 'Sport and tourism', 'Farming and fishing', 'Churches and schools'], 0, 'The courtroom and the library both appear as places that weigh lives unequally.'],
          ['Which best states the poem\'s view of dialogue?', ['It is useless', 'It has already succeeded', 'It should be left to politicians', 'It is imperfect but has to continue'], 3, 'The repeated command only makes sense if talking still matters.'],
        ],
      },
      {
        id: 'eldiablo', title: 'El Diablo Highway', gist: 'A highway as a picture of the society built over Country.',
        about: 'A dangerous road stands for the system everyone is expected to drive along. The poem speaks to "you", the traveller. Stay with the flow and you are left alone. Step out of line and you are pulled over, unless you are powerful. It closes on a three-line warning.',
        form: ['An extended allegory: the road is society', 'Second person, so the reader is the driver', 'Satire aimed at policing and punishment', 'Ends on a haiku-like tercet'],
        tone: 'Critical, ironic, cautionary',
        ideas: [
          ['Freedom that is really conformity', 'The open road looks like choice, yet there is only one direction to go.', 'Challenges the assumption that movement and progress equal freedom.', [
            ['Songlines set against the highway', 'Cultural allusion, juxtaposition', 'Two ways of crossing land: one belongs to Country, one is laid over it.'],
            ['The road as a wound in a body', 'Bodily, violent imagery', 'Development is shown as injury to something alive.'],
            ['Going with the flow of traffic', 'Metaphor, restrictive diction', 'Traffic language turns into a rule for how to live.'],
          ]],
          ['Justice depends on who you are', 'Small offences are policed hard while large abuses pass.', 'Reveals an inconsistency in institutions that claim to treat people equally.', [
            ['Minor behaviour watched, major wrongs ignored', 'Irony, parallel structure', 'Matching sentence shapes make the double standard plain.'],
            ['Prisons everywhere, the powerful untouched', 'Hyperbole, antithesis', 'Exaggeration shows punishment spreading in one direction only.'],
            ['Traffic words with a second meaning', 'Pun', 'Road control and social exclusion become the same thing.'],
          ]],
          ['Everyone on the road is responsible', 'People are not only victims of the system. Indifference keeps it running.', 'Invites readers to look at their own motivations.', [
            ['"You" throughout', 'Second-person address', 'The reader cannot stand outside the criticism.'],
            ['A familiar saying, twisted', 'Transformed proverb', 'Common wisdom is bent to show self-interest underneath.'],
            ['The final three lines', 'Personification, haiku-like tercet', 'The highway itself becomes the danger, and the warning is left hanging.'],
          ]],
        ],
        para: 'In El Diablo Highway, Watson uses an extended allegory to challenge the assumption that modern progress delivers freedom. The opening juxtaposition of {0.0} sets an ancient relationship with Country against a road imposed upon it, while the violent imagery of {0.1} represents development as an injury. The metaphor in {0.2} then recasts traffic as social conformity. Watson sharpens this critique through irony and parallel structure, {1.0}, exposing an inconsistency in institutions that punish the powerless and excuse the powerful. Crucially, the second-person address implicates the reader, and the personified highway of the final tercet, {2.2}, leaves an unresolved warning. The poem therefore positions readers to recognise their own complicity in the systems they travel through.',
        questions: [
          'How does Watson explore the tension between individual freedom and conformity in El Diablo Highway?',
          'To what extent does the poem challenge assumptions about justice and authority?',
          'How does the extended metaphor of the road shape your understanding of contemporary society?',
          'Analyse the effect of second-person address in El Diablo Highway.',
          '"Watson blames the driver as much as the road." Do you agree?',
        ],
        checks: [
          ['The highway mainly represents', ['a real holiday route', 'the social system people are expected to follow', 'the poet\'s childhood', 'the afterlife'], 1, 'The poem is an allegory. The road stands for society and its rules.'],
          ['Why is the poem written to "you"?', ['To make the reader a driver on the road', 'To address the police', 'To speak to the poet\'s father', 'Because it is a letter'], 0, 'Second person removes the reader\'s distance from the criticism.'],
          ['Setting songlines beside the highway is', ['hyperbole', 'onomatopoeia', 'juxtaposition with cultural allusion', 'a pun'], 2, 'Two ways of knowing and crossing land are placed together so the loss is visible.'],
          ['What does the poem say about punishment?', ['It is applied equally', 'It no longer exists', 'It only happens to the rich', 'It falls on the powerless while the powerful avoid it'], 3, 'The irony and antithesis in the middle of the poem make this double standard clear.'],
          ['The last three lines resemble', ['a sonnet', 'a haiku', 'a limerick', 'a ballad'], 1, 'A compact tercet with a haiku feel slows the poem into a warning.'],
          ['Which rubric idea fits the poem best?', ['Inconsistencies in human behaviour and institutions', 'The joy of travel', 'Nostalgia for childhood', 'Romantic love'], 0, 'It exposes people and systems that say one thing and do another.'],
        ],
      },
      {
        id: 'blacktracker', title: 'Blacktracker … Blackwriter … Blacksubject', short: 'Blacktracker …', gist: 'One writer, three roles, and a language that is not neutral.',
        about: 'A first-person speaker close to Watson himself describes his identity through three coined roles: the tracker, the writer and the subject. Writing is pictured as tracking across Country. English gives him a voice and also carries the power that took so much. He ends by placing Country above anything the page can hold.',
        form: ['Continuous prose poetry, no stanza breaks', 'The three labels repeat and shift', 'Extended metaphor: writing as tracking', 'Ends on a paradox about what writing is worth'],
        tone: 'Intimate, reflective, defiant',
        ideas: [
          ['Identity moves, the label stays', 'The speaker changes roles, yet he is always seen through race.', 'An individual experience that speaks for a collective one.', [
            ['The opening claim to be a blacktracker', 'First-person declaration', 'He names himself before anyone else can.'],
            ['The three labels returning through the poem', 'Repetition', 'Each return shows a different angle on the same self.'],
            ['The run of "not" statements about the blacksubject', 'Negation', 'He defines himself against what others have made of him.'],
          ]],
          ['Language is power and a trap', 'English lets him speak and risks distorting what he says.', 'A paradox: resisting a power by using its own tool.', [
            ['Writing described as following tracks over land', 'Extended metaphor', 'His craft is tied to an older skill, and to a history of trackers used by the colonisers.'],
            ['Royal English and ink that harms', 'Imagery of colonial language', 'The medium itself is shown carrying authority and damage.'],
            ['The unbroken block of prose', 'Prose poem form', 'With no stanza breaks, the three identities run into each other.'],
          ]],
          ['Country outweighs the page', 'Prizes and publication cannot match what Country means.', 'Challenges the assumption that recognition is the measure of a life.', [
            ['"We" appearing in place of "I"', 'Collective voice', 'The claim widens from one writer to a people.'],
            ['Reward and recognition pushed aside', 'Contrast', 'Success on the coloniser\'s terms is refused as the goal.'],
            ['The closing statement on what writing can never equal', 'Paradox, antithesis', 'A poem that doubts poetry: the most honest thing it can say about itself.'],
          ]],
        ],
        para: 'Watson represents identity as shifting and contested through a speaker who is at once tracker, writer and subject. The repetition of these coined labels, beginning with {0.0}, allows the persona to name himself, while the accumulating negation in {0.2} rejects the identities imposed upon him. The extended metaphor of writing as tracking, {1.0}, links his craft to Country but also to a colonial history, and the imagery of {1.1} reveals the paradox of resisting power in the language of that power. The unbroken prose form enacts this entanglement. Finally, the paradox of {2.2} places Country beyond the reach of literature. Watson thus challenges the assumption that recognition defines worth, presenting belonging to Country as the more enduring human experience.',
        questions: [
          'How does Watson explore cultural identity and belonging in Blacktracker … Blackwriter … Blacksubject?',
          'To what extent does the poem challenge assumptions about language and power?',
          'How does the prose poem form shape meaning in this text?',
          'Analyse how Watson represents the paradox of writing about Country in English.',
          '"The poem is about one man and about a whole people." Discuss.',
        ],
        checks: [
          ['How is the poem laid out?', ['In rhyming couplets', 'As continuous prose with no stanza breaks', 'As a sonnet', 'As a dialogue'], 1, 'It is a prose poem, and the unbroken block suits identities that run together.'],
          ['Writing is compared throughout to', ['sailing', 'building a house', 'tracking across land', 'cooking'], 2, 'The extended metaphor ties the writer\'s work to the tracker\'s.'],
          ['Why is English a problem for the speaker?', ['He cannot read it', 'It gives him a voice but carries colonial authority', 'It is too simple', 'It has no word for poetry'], 1, 'He has to resist power using that power\'s own language.'],
          ['The final idea of the poem is that', ['writing can never equal the worth of Country', 'prizes make it all worthwhile', 'he will stop being a tracker', 'English should be banned'], 0, 'The ending is a paradox: a piece of writing that ranks itself below Country.'],
          ['Repeating the three coined labels mainly shows', ['a stutter', 'three different speakers', 'a self that shifts between roles', 'a printing error'], 2, 'Each return gives another angle on one person.'],
          ['Which rubric term fits the speaker using English to question English?', ['Anomaly', 'Paradox', 'Setting', 'Collective memory'], 1, 'Two things that seem to cancel each other are both true.'],
        ],
      },
      {
        id: 'endofdays', title: 'End of Days', gist: 'The apocalypse, found in the finance pages.',
        about: 'The speaker reads financial news compulsively, worries about debt and bank letters, and watches headlines celebrate a mining boom on Country. Against all of it he feels the pull of his elders\' ways. The poem treats the market as a kind of doomsday.',
        context: 'Often read as a response to financial press coverage of the mining boom around 2012.',
        form: ['Free verse with a broken, frantic rhythm', 'Capitalised headlines and repeated commands', 'Markets set against elders\' traditions', 'A slow, haiku-like three-line ending'],
        tone: 'Satirical, darkly comic, anxious',
        ideas: [
          ['Prosperity that costs Country', 'Economic success is paid for with land and culture.', 'Challenges a whole society\'s assumptions about what progress means.', [
            ['Headlines shouted in capitals', 'Capitalisation, allusion to the financial press', 'The news is loud, and it drowns out what is being lost.'],
            ['The economy described as an act of violence', 'Violent metaphor', 'Profit is shown as something done to the land.'],
            ['Elders\' traditions beside market reports', 'Juxtaposition', 'Two value systems are put on the same page and cannot both be right.'],
          ]],
          ['Money breeds anxiety', 'Chasing security through money leaves the speaker powerless and afraid.', 'A widely shared modern experience, shown through one worried voice.', [
            ['Short, jolting lines and orders', 'Fragmented rhythm, repetition', 'The form has the speaker\'s pulse: fast and scattered.'],
            ['Jokes about debt that are not really jokes', 'Black humour, hyperbole', 'Laughing is how he copes with what he cannot change.'],
            ['A question asked of no one', 'Rhetorical question', 'There is nobody to answer, which is the point.'],
          ]],
          ['Wealth does not last', 'Money looks powerful and cannot give a life meaning.', 'A paradox in human motivation: people chase what will not stay.', [
            ['Pictures of death among the money talk', 'Death imagery', 'Mortality cuts the market down to size.'],
            ['The butterfly', 'Motif', 'Brief, fragile life set against the weight of finance. It links to two other prescribed poems.'],
            ['The last three lines', 'Haiku-like stanza', 'After the rush, the poem slows to something still and older than the market.'],
          ]],
        ],
        para: 'In End of Days, Watson satirises a society that mistakes prosperity for meaning. The capitalised headlines in {0.0} mimic the noise of the financial press, and the violent metaphor of {0.1} represents economic growth as harm done to Country. By juxtaposing this with his elders\' traditions, {0.2}, the speaker reveals a conflict between material and cultural values. His own anxiety is carried by a fragmented rhythm and by black humour such as {1.1}, exposing the paradox that the pursuit of financial security produces insecurity. The closing haiku-like stanza, {2.2}, slows the poem and sets the brief life of the butterfly against the market. Watson thereby challenges assumptions about success, suggesting that what endures is connection rather than wealth.',
        questions: [
          'How does Watson challenge assumptions about prosperity and success in End of Days?',
          'To what extent does the poem explore a conflict between material values and cultural identity?',
          'How does Watson use satire to reveal paradoxes in human motivation?',
          'Analyse how the rhythm and structure of End of Days represent anxiety.',
          '"The poem laughs because the alternative is despair." Discuss.',
        ],
        checks: [
          ['Where does the poem find its "apocalypse"?', ['In a war zone', 'In financial news and debt', 'In a bushfire', 'In a hospital'], 1, 'Doomsday language is moved onto the economy.'],
          ['Capitalised phrases in the poem imitate', ['gravestones', 'street signs', 'newspaper headlines', 'text messages'], 2, 'They sound like the financial press shouting.'],
          ['What is set against the market reports?', ['The elders\' traditions', 'A football game', 'A wedding', 'A school lesson'], 0, 'The juxtaposition puts two ideas of value side by side.'],
          ['The broken, hurried rhythm mainly conveys', ['calm', 'boredom', 'the speaker\'s anxiety', 'celebration'], 2, 'Form matches feeling: scattered lines for a scattered mind.'],
          ['The tone is best described as', ['romantic', 'satirical and darkly comic', 'neutral', 'nostalgic'], 1, 'It mocks the system while showing real distress underneath.'],
          ['How does the ending differ from the rest?', ['It gets faster', 'It switches language', 'It rhymes', 'It slows into three short, still lines'], 3, 'The haiku-like close steps out of the rush.'],
        ],
      },
      {
        id: 'addendum', title: 'Addendum', gist: 'The last poem: love, memory and what haunts them.',
        about: 'The closing poem of the collection. It opens under a line from W. H. Auden that ties love to death. The speaker talks directly to someone who is no longer there, a picture setting the memory off. Tenderness comes first, then ghosts and shadows. It finishes by echoing the book\'s title and trailing off.',
        alt: 'Another reading: an afterword to the whole book, asking readers for compassion and shared responsibility.',
        form: ['A short free-verse lyric', 'An epigraph from Auden before the first line', 'Tone darkens as it goes', 'Ends on an ellipsis, echoing the title of the collection'],
        tone: 'Tender, then unsettled',
        ideas: [
          ['Memory keeps people close', 'Remembering holds a bond in place after someone has gone.', 'An individual experience of loss that almost every reader shares.', [
            ['"I" speaking to "you"', 'First-person direct address', 'The reader overhears something private, which makes it intimate.'],
            ['The picture that starts the memory', 'Visual imagery', 'One image is enough to bring a whole person back.'],
            ['The Auden line above the poem', 'Epigraph, allusion', 'Love and mortality are tied together before the poem starts.'],
          ]],
          ['Love and hurt live together', 'Affection does not cancel resentment. Both stay.', 'A paradox in human emotion that the poem refuses to tidy up.', [
            ['Ghosts that bring old grievances', 'Personification', 'What haunts him is unfinished conflict as much as grief.'],
            ['Shadows that have weight', 'Paradox', 'Absence is felt as something physically there.'],
            ['The turn from warmth to darker images', 'Tonal shift', 'The poem lets the mood sour without correcting it.'],
          ]],
          ['Mortality sharpens love', 'Knowing time runs out is what makes the bond matter.', 'Invites readers to see the title of the whole collection as one idea, not two.', [
            ['The butterflies', 'Motif, personification', 'Short lives that carry a wish for more time. They link back to the first prescribed poem.'],
            ['Love poems and death threats named together', 'Juxtaposition', 'The opposites of the title are shown as parts of one experience.'],
            ['The trailing dots at the end', 'Ellipsis, open ending', 'The feeling is not finished, so the poem is not either.'],
          ]],
        ],
        para: 'Addendum closes the collection by representing love and loss as inseparable human experiences. The direct address in {0.0} creates intimacy, and the visual image of {0.1} shows how a single object can summon an absent person. Framed by an epigraph from Auden, the poem links affection to mortality from the outset. Watson then complicates this tenderness: the personified ghosts in {1.0} carry unresolved resentment, and the paradox of {1.1} gives absence a physical presence. The recurring butterfly motif, {2.0}, suggests a longing for more time, while the final juxtaposition and ellipsis, {2.2}, leave the emotion unresolved. Watson therefore challenges the assumption that grief and love are opposites, revealing the paradoxes at the centre of human connection.',
        questions: [
          'How does Watson explore the complexities of love and memory in Addendum?',
          'To what extent does the poem suggest that mortality gives relationships their meaning?',
          'How does Addendum shape your understanding of the collection as a whole?',
          'Analyse how Watson uses paradox to represent human emotion.',
          '"The poem ends without ending." Discuss the effect of this choice.',
        ],
        checks: [
          ['Where does Addendum sit in the collection?', ['First', 'In the middle', 'Last', 'It is not in the collection'], 2, 'It is the closing poem, which is why it can echo the title of the book.'],
          ['The line from W. H. Auden before the poem is called', ['an epigraph', 'an epilogue', 'a refrain', 'a caesura'], 0, 'An epigraph is a quotation placed at the head of a text.'],
          ['Shadows that have physical weight are an example of', ['alliteration', 'paradox', 'simile', 'hyperbole'], 1, 'Absence is described as something solid.'],
          ['What do the ghosts bring into the memory?', ['Comfort only', 'Humour', 'Unresolved resentment', 'Financial worry'], 2, 'They make the remembering mixed rather than purely tender.'],
          ['The ellipsis at the end suggests', ['the feeling is unfinished', 'a page is missing', 'the speaker has forgotten', 'the poem is a draft'], 0, 'Trailing off keeps the emotion open.'],
          ['Which poem does the butterfly motif link Addendum to?', ['Finn', 'El Diablo Highway', "Let's Talk!", 'The Remedy of Butterflies'], 3, 'Butterflies also appear there and in End of Days.'],
        ],
      },
    ],
  }];

  // ---- what this student has saved, kept on their device ----
  let ctx = { uid: 'anon' }, root = null, tab = 'guide', cur = null, drill = null;
  const key = () => 'tb_poems_' + ctx.uid;
  const load = () => { try { return JSON.parse(localStorage.getItem(key())) || {}; } catch { return {}; } };
  const save = (d) => { try { localStorage.setItem(key(), JSON.stringify(d)); } catch {} };
  const store = () => { const d = load(); d.q = d.q || {}; d.c = d.c || {}; return d; };
  const setFor = (subject) => SETS.find(s => s.subjects.includes(subject));
  const qKey = (p, i, j) => `${p.id}.${i}.${j}`;
  const rowsOf = (p) => p.ideas.flatMap((idea, i) => idea[3].map((r, j) => ({ i, j, idea: idea[0], find: r[0], tech: r[1], effect: r[2], k: qKey(p, i, j) })));
  const nQuotes = (p, d) => rowsOf(p).filter(r => (d.q[r.k] || '').trim()).length;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

  function hub(set) {
    const d = store();
    root.innerHTML = '';
    root.appendChild(mk('p', 'po-kicker', esc(set.poet)));
    root.appendChild(mk('h1', '', esc(set.title)));
    const grid = mk('div', 'po-grid');
    set.poems.forEach((p, n) => {
      const got = d.c[p.id], nq = nQuotes(p, d), total = rowsOf(p).length;
      const a = mk('a', 'po-tile', `<span class="po-num">${n + 1}</span><b>${esc(p.title)}</b><span class="po-gist">${esc(p.gist)}</span>
        <span class="po-prog"><i class="${got != null ? 'on' : ''}">${got != null ? `${got}/${p.checks.length}` : 'Check'}</i><i class="${nq ? 'on' : ''}">${nq}/${total} quotes</i></span>`);
      a.href = `#poems/${p.id}`; grid.appendChild(a);
    });
    root.appendChild(grid);

    const th = mk('div', 'card po-threads', '<h2>Which poems for which idea</h2><div class="chips" id="po-chips"></div><div id="po-thread"></div>');
    root.appendChild(th);
    const drawThread = (t) => {
      th.querySelectorAll('#po-chips button').forEach(b => b.classList.toggle('tagged', b.textContent === t[0]));
      th.querySelector('#po-thread').innerHTML = `<p class="po-claim">${esc(t[1])}</p><div class="po-links">${t[2].map(id => { const p = set.poems.find(x => x.id === id); return `<a class="button" href="#poems/${id}">${esc(p.short || p.title)}</a>`; }).join('')}</div>`;
    };
    set.threads.forEach(t => { const b = mk('button', '', esc(t[0])); b.type = 'button'; b.onclick = () => drawThread(t); th.querySelector('#po-chips').appendChild(b); });
    drawThread(set.threads[0]);

    const qs = mk('div', 'card', `<h2>Essay questions on the whole collection</h2>`);
    qs.appendChild(questionList(set.questions));
    root.appendChild(qs);
    root.appendChild(mk('p', 'small muted po-foot', esc(set.poetFacts.join(' · '))));
  }

  function questionList(list) {
    const ol = mk('ol', 'po-qs');
    list.forEach(q => ol.appendChild(mk('li', '', esc(q))));
    return ol;
  }

  function poem(set, p) {
    cur = p;
    root.innerHTML = '';
    root.appendChild(mk('a', 'back small', `‹ ${esc(set.title)}`)).href = '#poems';
    root.appendChild(mk('h1', '', esc(p.title)));
    const tabs = mk('div', 'tabs'); tabs.setAttribute('role', 'tablist');
    [['guide', 'Guide'], ['quotes', 'Quotes'], ['check', 'Quick check'], ['write', 'Write']].forEach(([id, label]) => {
      const b = mk('button', id === tab ? 'on' : '', label); b.type = 'button'; b.setAttribute('role', 'tab');
      b.onclick = () => { tab = id; drill = null; poem(set, p); };
      tabs.appendChild(b);
    });
    root.appendChild(tabs);
    const pane = mk('div', 'po-pane'); root.appendChild(pane);
    ({ guide, quotes, check, write })[tab](pane, set, p);
    const i = set.poems.indexOf(p), next = set.poems[(i + 1) % set.poems.length];
    root.appendChild(mk('a', 'po-next', `Next poem: <b>${esc(next.title)}</b> ›`)).href = `#poems/${next.id}`;
  }

  // the quote box under an evidence row: typed once, reused by the drill and the model paragraph
  function quoteBox(p, r, d, onChange) {
    const inp = mk('input', 'po-quote'); inp.type = 'text'; inp.maxLength = 160; inp.placeholder = 'Your quote, from your copy'; inp.value = d.q[r.k] || '';
    inp.setAttribute('aria-label', `Your quote for: ${r.find}`);
    inp.onchange = () => { const s = store(); const v = inp.value.trim(); if (v) s.q[r.k] = v; else delete s.q[r.k]; save(s); if (onChange) onChange(); };
    return inp;
  }

  function guide(pane, set, p) {
    const d = store();
    pane.appendChild(mk('p', 'po-about', esc(p.about)));
    if (p.context) pane.appendChild(mk('p', 'small muted', esc(p.context)));
    p.ideas.forEach((idea, i) => {
      const det = mk('details', 'card po-idea'); if (i === 0) det.open = true;
      det.appendChild(mk('summary', '', `<span class="po-num">${i + 1}</span><span><b>${esc(idea[0])}</b><span class="po-claim">${esc(idea[1])}</span></span>`));
      idea[3].forEach((row, j) => {
        const r = { find: row[0], k: qKey(p, i, j) };
        const box = mk('div', 'po-ev', `<p class="po-find">${esc(row[0])}</p><p class="po-tech">${esc(row[1])}</p><p class="po-effect">${esc(row[2])}</p>`);
        box.appendChild(quoteBox(p, r, d));
        det.appendChild(box);
      });
      det.appendChild(mk('p', 'po-link small', `<b>Human experiences:</b> ${esc(idea[2])}`));
      pane.appendChild(det);
    });
    const f = mk('div', 'card', `<h2>Form and tone</h2><ul class="po-form">${p.form.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small muted">Tone: ${esc(p.tone)}</p>`);
    pane.appendChild(f);
    if (p.alt) pane.appendChild(mk('p', 'po-alt small', esc(p.alt)));
  }

  function quotes(pane, set, p) {
    const d = store(), rows = rowsOf(p), have = rows.filter(r => (d.q[r.k] || '').trim());
    if (drill) return drillCard(pane, set, p);
    const head = mk('div', 'po-qhead', `<p class="po-big">${have.length}<span>/${rows.length}</span></p>`);
    const go = mk('button', 'primary', have.length ? 'Test me' : 'Add a quote to start'); go.type = 'button'; go.disabled = !have.length;
    go.onclick = () => { drill = { list: have.map(r => r.k).sort(() => Math.random() - .5), i: 0, right: 0 }; poem(set, p); };
    head.appendChild(go); pane.appendChild(head);
    const list = mk('div', 'card po-bank');
    rows.forEach(r => {
      const row = mk('div', 'po-brow', `<p class="po-find">${esc(r.find)}</p><p class="po-tech">${esc(r.tech)}</p>`);
      row.appendChild(quoteBox(p, r, d, () => { tab = 'quotes'; poem(set, p); }));
      list.appendChild(row);
    });
    pane.appendChild(list);
  }

  // recall: type the quote from memory; a hint gives the first letter of each word
  function drillCard(pane, set, p) {
    const d = store(), rows = rowsOf(p);
    if (drill.i >= drill.list.length) {
      const done = mk('div', 'card po-done', `<p class="po-big">${drill.right}<span>/${drill.list.length}</span></p><p class="muted">quotes from memory</p>`);
      const again = mk('button', 'primary', 'Go again'); again.type = 'button'; again.onclick = () => { drill = { list: drill.list.slice().sort(() => Math.random() - .5), i: 0, right: 0 }; poem(set, p); };
      const back = mk('button', 'ghost', 'Back to my quotes'); back.type = 'button'; back.onclick = () => { drill = null; poem(set, p); };
      done.append(again, back); pane.appendChild(done);
      if (drill.right === drill.list.length && window.TBconfetti) { try { window.TBconfetti(40); } catch {} }
      return;
    }
    const r = rows.find(x => x.k === drill.list[drill.i]), answer = d.q[r.k];
    const card = mk('div', 'card po-drill', `<p class="small muted">${drill.i + 1} of ${drill.list.length}</p><p class="po-find">${esc(r.find)}</p><p class="po-tech">${esc(r.tech)}</p><p class="po-hint" hidden></p>`);
    const inp = mk('input', 'po-quote'); inp.type = 'text'; inp.placeholder = 'Type the quote'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', 'Type the quote from memory');
    const out = mk('p', 'po-out'); out.hidden = true;
    const hint = mk('button', 'ghost', 'Hint'); hint.type = 'button';
    hint.onclick = () => { const h = card.querySelector('.po-hint'); h.hidden = false; h.textContent = answer.split(/\s+/).map(w => w[0] + '_'.repeat(Math.max(0, w.length - 1))).join(' '); drill.hinted = true; };
    const ok = mk('button', 'primary', 'Check'); ok.type = 'button';
    const doCheck = () => {
      if (ok.dataset.done) { drill.i++; drill.hinted = false; return poem(set, p); }
      const want = norm(answer).split(' '), got = new Set(norm(inp.value).split(' '));
      const hit = want.filter(w => got.has(w)).length, right = norm(inp.value) === norm(answer);
      const close = !right && hit / want.length >= .8;
      if (right || close) drill.right++;
      out.hidden = false; out.className = 'po-out ' + (right ? 'good' : close ? 'near' : 'bad');
      out.innerHTML = `<b>${right ? 'Word perfect' : close ? 'Close enough to use' : 'Not yet'}</b> ${answer.split(/\s+/).map(w => `<span class="${got.has(norm(w)) ? '' : 'miss'}">${esc(w)}</span>`).join(' ')}<span class="po-eff">${esc(r.effect)}</span>`;
      inp.disabled = true; hint.hidden = true; ok.textContent = 'Next'; ok.dataset.done = '1'; ok.focus();
    };
    ok.onclick = doCheck; inp.onkeydown = (e) => { if (e.key === 'Enter') doCheck(); };
    const bar = mk('div', 'po-bar'); bar.append(hint, ok);
    card.append(inp, out, bar); pane.appendChild(card);
    setTimeout(() => inp.focus(), 0);
  }

  function check(pane, set, p) {
    const picked = new Array(p.checks.length).fill(null);
    const score = mk('p', 'po-score', `<b>0</b> / ${p.checks.length}`); pane.appendChild(score);
    p.checks.forEach((c, n) => {
      const card = mk('div', 'card po-check', `<p class="po-q"><span class="po-num">${n + 1}</span>${esc(c[0])}</p>`);
      const why = mk('p', 'po-why small'); why.hidden = true; why.textContent = c[3];
      c[1].forEach((opt, k) => {
        const b = mk('button', 'po-opt', esc(opt)); b.type = 'button';
        b.onclick = () => {
          if (picked[n] != null) return;
          picked[n] = k;
          card.querySelectorAll('.po-opt').forEach((x, xi) => { x.disabled = true; if (xi === c[2]) x.classList.add('good'); else if (xi === k) x.classList.add('bad'); });
          why.hidden = false;
          const right = picked.filter((v, i) => v === p.checks[i][2]).length;
          score.innerHTML = `<b>${right}</b> / ${p.checks.length}`;
          if (picked.every(v => v != null)) {
            const s = store(); s.c[p.id] = Math.max(s.c[p.id] || 0, right); save(s);
            score.classList.add('done');
            if (right === p.checks.length && window.TBconfetti) { try { window.TBconfetti(40); } catch {} }
          }
        };
        card.appendChild(b);
      });
      card.appendChild(why); pane.appendChild(card);
    });
  }

  // ---- Write: one guided paragraph, a step at a time (question, idea, point, evidence, effect, link, paragraph) ----
  const STEPS = ['Question', 'Idea', 'Point', 'Evidence', 'Effect', 'Link', 'Paragraph'];
  const RUBRIC = [['paradox', 'paradox'], ['anomaly', 'anomal'], ['inconsistency', 'inconsisten'], ['assumptions', 'assum'], ['individual', 'individual'], ['collective', 'collective'], ['challenges', 'challeng'], ['invites', 'invit'], ['human experience', 'human experience']];
  const STOP = new Set(['watson', 'watsons', 'extent', 'explore', 'explores', 'analyse', 'discuss', 'reference', 'represent', 'represents', 'suggest', 'suggests', 'through', 'within', 'about', 'which', 'their', 'shape', 'shapes', 'your', 'does', 'what', 'with', 'that', 'this', 'from', 'more', 'agree', 'poem', 'poetry', 'understanding']);
  const words = (s) => (s.trim().match(/\S+/g) || []).length;
  const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  function write(pane, set, p) {
    const d = store(); d.w = d.w || {};
    const w = d.w[p.id] || { step: 0, ev: [], eff: {} };
    const keep = () => { const s = store(); s.w = s.w || {}; s.w[p.id] = w; save(s); };
    const go = (n) => { w.step = n; keep(); poem(set, p); };
    const titleWords = new Set(norm(p.title).split(' '));
    const keys = w.q != null ? [...new Set(norm(p.questions[w.q]).split(' ').filter(x => x.length > 4 && !STOP.has(x) && !titleWords.has(x)))] : [];
    const hasKey = (t) => { const n = norm(t); return keys.some(k => n.includes(k.slice(0, Math.max(5, k.length - 2)))); };
    const rows = w.idea != null ? rowsOf(p).filter(r => r.i === w.idea) : [];
    const picked = () => w.ev.map(k => rows.find(r => r.k === k)).filter(Boolean);

    const dots = mk('div', 'po-steps');
    STEPS.forEach((s, i) => { const b = mk('button', i === w.step ? 'on' : i < w.step ? 'done' : '', `<span>${esc(s)}</span>`); b.type = 'button'; b.disabled = i > w.step; b.title = s; b.onclick = () => go(i); dots.appendChild(b); });
    pane.appendChild(dots);
    const card = mk('div', 'card po-step'); pane.appendChild(card);
    const head = (h, sub) => { card.appendChild(mk('h2', '', esc(h))); if (sub) card.appendChild(mk('p', 'po-sub', esc(sub))); };
    const foot = (ok, onNext, label) => {
      const bar = mk('div', 'po-bar');
      if (w.step > 0) { const b = mk('button', 'ghost', 'Back'); b.type = 'button'; b.onclick = () => go(w.step - 1); bar.appendChild(b); }
      const n = mk('button', 'primary', label || 'Next'); n.type = 'button'; n.disabled = !ok(); n.onclick = () => { if (onNext) onNext(); go(w.step + 1); };
      bar.appendChild(n); card.appendChild(bar);
      return () => { n.disabled = !ok(); };
    };
    const area = (val, ph, rowsN) => { const t = mk('textarea', 'po-ta'); t.rows = rowsN || 3; t.placeholder = ph; t.value = val || ''; return t; };
    const ticks = (items) => { const ul = mk('ul', 'po-ticks'); const draw = () => { ul.innerHTML = items.map(([l, f]) => `<li class="${f() ? 'on' : ''}">${esc(l)}</li>`).join(''); }; draw(); card.appendChild(ul); return draw; };

    if (w.step === 0) {
      head('Pick a question');
      p.questions.forEach((q, i) => { const b = mk('button', 'po-opt' + (w.q === i ? ' sel' : ''), esc(q)); b.type = 'button'; b.onclick = () => { w.q = i; go(1); }; card.appendChild(b); });
    } else if (w.step === 1) {
      head('Which idea answers it best?', p.questions[w.q]);
      p.ideas.forEach((idea, i) => { const b = mk('button', 'po-opt' + (w.idea === i ? ' sel' : ''), `<b>${esc(idea[0])}</b><span>${esc(idea[1])}</span>`); b.type = 'button'; b.onclick = () => { if (w.idea !== i) { w.idea = i; w.ev = []; w.eff = {}; } go(2); }; card.appendChild(b); });
      if (w.step > 0) { const bar = mk('div', 'po-bar'); const b = mk('button', 'ghost', 'Back'); b.type = 'button'; b.onclick = () => go(0); bar.appendChild(b); card.appendChild(bar); }
    } else if (w.step === 2) {
      head('Make your point', p.questions[w.q]);
      const t = area(w.point, 'One sentence that answers the question'); card.appendChild(t);
      const st = mk('button', 'ghost small', 'Give me a starter'); st.type = 'button';
      st.onclick = () => { t.value = `In ${p.title}, Watson shows that ${lower1(p.ideas[w.idea][1])}`; t.dispatchEvent(new Event('input')); t.focus(); };
      card.appendChild(st);
      const draw = ticks([['Names the poem or Watson', () => /watson/i.test(t.value) || norm(t.value).includes(norm(p.short || p.title).split(' ')[0])], ['Uses a word from the question', () => hasKey(t.value)], ['A full sentence', () => words(t.value) >= 8]]);
      const upd = foot(() => words(t.value) >= 8, () => { w.point = t.value.trim(); });
      t.oninput = () => { w.point = t.value; keep(); draw(); upd(); };
      setTimeout(() => t.focus(), 0);
    } else if (w.step === 3) {
      head('Pick two pieces of evidence', p.ideas[w.idea][0]);
      let upd = () => {};
      rows.forEach(r => {
        const box = mk('div', 'po-pick' + (w.ev.includes(r.k) ? ' sel' : ''), `<p class="po-find">${esc(r.find)}</p><p class="po-tech">${esc(r.tech)}</p>`);
        const inp = quoteBox(p, r, d, () => upd()); inp.onclick = (e) => e.stopPropagation(); inp.oninput = () => { const s = store(); s.q[r.k] = inp.value.trim(); save(s); upd(); };
        box.appendChild(inp);
        box.onclick = () => { if (w.ev.includes(r.k)) w.ev = w.ev.filter(k => k !== r.k); else { if (w.ev.length >= 2) w.ev.shift(); w.ev.push(r.k); } keep(); card.querySelectorAll('.po-pick').forEach((b, bi) => b.classList.toggle('sel', w.ev.includes(rows[bi].k))); upd(); };
        card.appendChild(box);
      });
      upd = foot(() => { const s = store(); return w.ev.length === 2 && w.ev.every(k => (s.q[k] || '').trim()); });
      card.appendChild(mk('p', 'small muted po-note', 'Tap two, and type each quote from your copy.'));
    } else if (w.step === 4) {
      head('Say what each one does');
      const s = store(); let upd = () => {};
      const tas = picked().map(r => {
        const stem = `The ${r.tech.split(',')[0].toLowerCase()} in “${s.q[r.k]}” `;
        const t = area(w.eff[r.k] || stem, 'Finish the sentence: what does the reader see or feel?', 3);
        const hint = mk('button', 'ghost small', 'Hint'); hint.type = 'button';
        const h = mk('p', 'po-hintline small'); h.hidden = true; h.textContent = r.effect; hint.onclick = () => { h.hidden = false; hint.hidden = true; };
        t.oninput = () => { w.eff[r.k] = t.value; keep(); upd(); };
        card.append(t, hint, h);
        return [t, stem];
      });
      upd = foot(() => tas.every(([t, stem]) => words(t.value) >= words(stem) + 6), () => { tas.forEach(([t], i) => { w.eff[w.ev[i]] = t.value.trim(); }); });
      setTimeout(() => { const t = tas[0] && tas[0][0]; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 0);
    } else if (w.step === 5) {
      head('Link back to the question', p.questions[w.q]);
      const t = area(w.link, 'One sentence: so what does Watson show us?'); card.appendChild(t);
      const chips = mk('div', 'chips po-rub');
      RUBRIC.forEach(([word]) => { const b = mk('button', '', esc(word)); b.type = 'button'; b.onclick = () => { t.value = (t.value && !/\s$/.test(t.value) ? t.value + ' ' : t.value) + word; t.dispatchEvent(new Event('input')); t.focus(); }; chips.appendChild(b); });
      card.appendChild(chips);
      const draw = ticks([['Uses a word from the question', () => hasKey(t.value)], ['Uses the module\'s language', () => RUBRIC.some(([, stem]) => t.value.toLowerCase().includes(stem))]]);
      const upd = foot(() => words(t.value) >= 8, () => { w.link = t.value.trim(); if (!w.final) w.final = [w.point, ...w.ev.map(k => w.eff[k]), w.link].map(x => (x || '').trim()).map(x => /[.!?]$/.test(x) ? x : x + '.').join(' '); }, 'Build my paragraph');
      t.oninput = () => { w.link = t.value; keep(); draw(); upd(); };
      setTimeout(() => t.focus(), 0);
    } else {
      head('Your paragraph', p.questions[w.q]);
      const s = store();
      const t = area(w.final, '', 9); card.appendChild(t);
      const count = mk('p', 'po-count small muted'); card.appendChild(count);
      const draw = ticks([
        ['Answers the question', () => hasKey(t.value)],
        ['Two quotes', () => w.ev.every(k => norm(t.value).includes(norm(s.q[k] || '\u0000')))],
        ['Names each technique', () => picked().every(r => t.value.toLowerCase().includes(r.tech.split(',')[0].toLowerCase()))],
        ['Uses the module\'s language', () => RUBRIC.some(([, stem]) => t.value.toLowerCase().includes(stem))],
        ['120 to 250 words', () => words(t.value) >= 120 && words(t.value) <= 250],
      ]);
      const cnt = () => { count.textContent = `${words(t.value)} words`; }; cnt();
      t.oninput = () => { w.final = t.value; keep(); draw(); cnt(); };
      const bar = mk('div', 'po-bar');
      const again = mk('button', 'ghost', 'Start another'); again.type = 'button'; again.onclick = () => { const st = store(); if (st.w) delete st.w[p.id]; save(st); poem(set, p); };
      const copy = mk('button', ctx.askTutor ? '' : 'primary', 'Copy'); copy.type = 'button';
      copy.onclick = async () => { try { await navigator.clipboard.writeText(t.value); copy.textContent = 'Copied'; } catch { t.select(); } };
      bar.append(again, copy);
      if (ctx.askTutor) {
        const m = mk('button', 'primary', 'Mark it with the tutor'); m.type = 'button';
        m.onclick = () => ctx.askTutor(`Mark this Common Module (Texts and Human Experiences) body paragraph on ${set.poet}'s "${p.title}" the way an HSC marker would. Give me a mark out of 5, what works, and the one change that would lift it most. Do not rewrite it for me. Question: ${p.questions[w.q]} Paragraph: ${t.value}`);
        bar.appendChild(m);
      }
      card.appendChild(bar);
    }

    const html = esc(p.para).replace(/\{(\d)\.(\d)\}/g, (m, i, j) => {
      const row = p.ideas[+i][3][+j], q = (d.q[qKey(p, +i, +j)] || '').trim();
      return q ? `<mark class="po-fill">“${esc(q)}”</mark>` : `<span class="po-slot">${esc(lower1(row[0]))}</span>`;
    });
    pane.appendChild(mk('details', 'card po-para po-model', `<summary>See a model paragraph</summary><p>${html}</p>`));
    const pairs = set.threads.filter(t => t[2].includes(p.id));
    if (pairs.length) {
      const pc = mk('details', 'card po-model', '<summary>Poems to pair it with</summary>');
      pairs.forEach(t => { pc.appendChild(mk('p', 'po-pair', `<b>${esc(t[0])}</b> ${t[2].filter(id => id !== p.id).map(id => { const o = set.poems.find(x => x.id === id); return `<a href="#poems/${id}">${esc(o.short || o.title)}</a>`; }).join(' · ')}`)); });
      pane.appendChild(pc);
    }
  }

  let lastPoem = null;
  window.Poems = {
    has: (subject) => !!setFor(subject),
    render(el, subject, c) {
      root = el; ctx = Object.assign({ uid: 'anon' }, c || {});
      const set = setFor(subject); if (!set) { el.innerHTML = ''; return; }
      const parts = (location.hash || '').slice(1).split('/');
      const p = set.poems.find(x => x.id === parts[1]);
      if (!p) { lastPoem = null; return hub(set); }
      if (lastPoem !== p.id) { tab = ['guide', 'quotes', 'check', 'write'].includes(parts[2]) ? parts[2] : 'guide'; drill = null; lastPoem = p.id; }
      poem(set, p);
    },
  };
})();
