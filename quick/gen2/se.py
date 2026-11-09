from lib import Bank
b = Bank('quick-se', 'se', typed=True, seed=71)
M, W = b.M, b.W
def X(mk):
    return [('Explains all key points clearly with correct terms', mk)] + [(['Identifies a relevant point', 'Describes the main points', 'Explains most points with some links'][i], i + 1) for i in range(mk - 1)][::-1]
code = lambda s: f'<code>{s}</code>'

T = 'Programming Fundamentals'
M(T, 'Which data type stores a whole number?', 'Integer', ['Float', 'String', 'Boolean'], 'Integers have no fractional part.')
M(T, 'In Python, ' + code('len("hello")') + ' returns', '5', ['4', '6', '"hello"'], 'It counts the characters.')
M(T, 'A loop that runs a known number of times is best written as a', 'for loop', ['while loop with no condition', 'recursive function', 'if statement'], 'Counted (definite) iteration.')
M(T, 'What does ' + code('7 // 2') + ' give in Python?', '3', ['3.5', '4', '1'], '// is integer (floor) division.')
M(T, 'What does ' + code('7 % 2') + ' give in Python?', '1', ['3', '3.5', '0'], '% gives the remainder.')
M(T, 'A desk check is', 'manually tracing an algorithm with test data', ['running automated unit tests', 'compiling the code', 'checking for spelling'], 'You track variable values in a table.')
M(T, 'Which error occurs when code breaks the language rules?', 'Syntax error', ['Logic error', 'Runtime error', 'Rounding error'], 'The interpreter cannot parse it.')
M(T, 'A logic error', 'gives wrong output without crashing', ['stops the program compiling', 'always crashes the program', 'is caught by the interpreter'], 'The code runs but does the wrong thing.')
M(T, 'Binary search requires the list to be', 'sorted', ['unsorted', 'of even length', 'made of strings'], 'It halves the search space each step.')
M(T, 'The worst-case number of comparisons for a linear search of 1000 items is', '1000', ['10', '500', '1'], 'Every item may need checking.')
M(T, 'Stubs are used in development to', 'stand in for modules not yet written', ['speed up the CPU', 'store data permanently', 'remove bugs automatically'], 'They let other parts be tested.')
M(T, 'Which structure stores key–value pairs in Python?', 'Dictionary', ['List', 'Tuple', 'Set'], 'e.g. {"name": "Ana"}.')
M(T, 'Boundary testing checks', 'values at the edges of valid ranges', ['only typical values', 'the user interface colours', 'network speed'], 'e.g. 0, 100 and 101 for a 0–100 range.')
W(T, 2, 'Distinguish between a syntax error and a logic error, with an example of each.', ['A syntax error breaks the language rules so the code will not run, e.g. a missing colon after an if statement.', 'A logic error lets the code run but produces the wrong result, e.g. using < instead of <= so the last item is skipped.'], X(2))
W(T, 3, 'Write an algorithm (pseudocode or Python) that returns the largest number in a list, and desk check it with [4, 9, 2].', ['largest ← list[0]; FOR each item in list: IF item > largest THEN largest ← item; RETURN largest', 'Desk check: largest = 4; item 4 (no change); item 9 > 4 so largest = 9; item 2 (no change).', 'Returns 9.'], [('Correct algorithm and correct desk check', 3), ('Correct algorithm with a minor error, or partial desk check', 2), ('Some correct logic', 1)])
W(T, 2, 'Explain why binary search is faster than linear search on a large sorted list.', ['Binary search checks the middle item and discards half the remaining list each step.', 'So it needs about log₂ n comparisons (about 20 for a million items) instead of up to n for linear search.'], X(2))

T = 'The Object-oriented Paradigm'
M(T, 'A class is', 'a blueprint for creating objects', ['a single instance of an object', 'a variable that stores numbers', 'a type of loop'], 'Objects are instances of a class.')
M(T, 'Encapsulation means', 'bundling data with the methods that use it and hiding internal details', ['inheriting from a parent class', 'methods with the same name behaving differently', 'storing data in a database'], 'Access is through a public interface.')
M(T, 'Inheritance allows a class to', 'reuse and extend the attributes and methods of another class', ['hide its data', 'run faster', 'have no methods'], 'e.g. Dog inherits from Animal.')
M(T, 'Polymorphism allows', 'the same method call to behave differently for different classes', ['a class to have only one object', 'data to be hidden', 'code to compile faster'], 'e.g. speak() for Dog and Cat.')
M(T, 'In Python, the method run when an object is created is', code('__init__'), [code('__str__'), code('__main__'), code('self')], 'The constructor sets initial attributes.')
M(T, 'An abstraction in OOP', 'shows only the essential features and hides complexity', ['copies an object', 'deletes unused objects', 'is a type of error'], 'Users of a class need not know how it works inside.')
M(T, 'In a class diagram, a "+" before an attribute means it is', 'public', ['private', 'protected', 'static'], '"−" means private.')
W(T, 2, 'Explain the benefit of inheritance in object-oriented programming.', ['Common attributes and methods are written once in a parent class and reused by child classes.', 'This reduces repeated code, makes maintenance easier (a fix in the parent applies to all) and lets child classes add or override behaviour.'], X(2))
W(T, 3, 'Outline the class structure you would use for a library system with books and DVDs, using OOP features.', ['A parent class Item with attributes title, id and on_loan, and methods borrow() and return_item().', 'Child classes Book (author, pages) and DVD (runtime, rating) inherit from Item.', 'Attributes are private with getter methods (encapsulation), and a method such as loan_period() is overridden in each child (polymorphism).'], X(3))

T = 'Programming Mechatronics'
M(T, 'A sensor in a mechatronic system', 'measures a physical quantity and sends data to the controller', ['moves a part of the system', 'stores the program', 'supplies power'], 'e.g. ultrasonic distance sensor.')
M(T, 'An actuator', 'converts a control signal into movement', ['measures temperature', 'stores data', 'compiles code'], 'e.g. motor, servo, solenoid.')
M(T, 'A servo motor is used when', 'precise angular position is needed', ['continuous high-speed rotation is needed', 'measuring light', 'storing energy'], 'It uses feedback to hold position.')
M(T, 'A closed-loop control system', 'uses feedback from sensors to adjust its output', ['has no sensors', 'runs once and stops', 'cannot be programmed'], 'e.g. a thermostat.')
M(T, 'PWM (pulse width modulation) is used to', 'control motor speed or LED brightness', ['measure distance', 'store data', 'convert AC to DC'], 'Changing the duty cycle changes average power.')
W(T, 2, 'Distinguish between open-loop and closed-loop control.', ['Open-loop control runs set instructions with no feedback (e.g. a timed toaster).', 'Closed-loop control measures the output with sensors and adjusts it to reach a target (e.g. a robot that slows as it nears a wall).'], X(2))
W(T, 3, 'Describe how a line-following robot uses sensors, a controller and actuators.', ['Infrared sensors under the robot detect the contrast between the line and the floor.', 'The microcontroller reads the sensors and decides whether the robot has drifted left or right.', 'It changes the speed of the left and right motors (actuators), e.g. with PWM, to steer back onto the line, repeating continuously in a loop.'], X(3))

T = 'Secure Software Architecture'
M(T, 'SQL injection is prevented best by', 'using parameterised queries', ['hiding the database', 'using longer passwords', 'disabling JavaScript'], 'User input is never treated as SQL code.')
M(T, 'Hashing passwords means', 'storing a one-way digest instead of the password', ['encrypting so it can be decrypted later', 'storing it in plain text', 'emailing it to the user'], 'Salting adds a random value before hashing.')
M(T, 'Cross-site scripting (XSS) is when', 'an attacker\'s script runs in another user\'s browser', ['a database is overloaded', 'a password is guessed', 'a server is physically stolen'], 'Prevent it by escaping output.')
M(T, '"Security by design" means', 'building security in from the start of development', ['adding security after release', 'only testing security at the end', 'relying on users to be careful'], 'It is cheaper and more effective.')
M(T, 'The principle of least privilege means', 'users and processes get only the access they need', ['everyone has admin access', 'passwords are never required', 'all data is public'], 'It limits the damage of a breach.')
M(T, 'Multi-factor authentication requires', 'two or more different kinds of evidence of identity', ['two passwords', 'a longer password', 'no password'], 'e.g. password plus a code on your phone.')
M(T, 'A salt in password hashing', 'stops identical passwords having identical hashes', ['makes passwords shorter', 'decrypts the hash', 'encrypts the database'], 'It defeats rainbow tables.')
M(T, 'Broken authentication, injection and XSS are examples from', 'the OWASP Top 10', ['the ISO 9001 standard', 'the Privacy Act', 'the IEEE floating point standard'], 'OWASP lists the most critical web risks.')
W(T, 2, 'Explain why passwords should be hashed and salted rather than encrypted.', ['Hashing is one-way, so even if the database is stolen the original passwords cannot simply be decrypted.', 'A unique salt per user means identical passwords give different hashes, defeating precomputed (rainbow table) attacks.'], X(2))
W(T, 3, 'Explain how SQL injection works and how to prevent it.', ['If user input is joined directly into an SQL string, an attacker can enter SQL code (e.g. \' OR 1=1 --) that changes the query.', 'This can bypass logins or read, change or delete data.', 'Prevent it with parameterised queries (prepared statements), input validation and least-privilege database accounts.'], X(3))
W(T, 4, 'Evaluate the effectiveness of multi-factor authentication in securing a school portal.', ['MFA requires something you know (password) plus something you have (phone app, code) or are (biometric).', 'A stolen or guessed password alone is no longer enough, which stops most credential-stuffing and phishing attacks.', 'Limitations: users may find it slower, lose phones or approve fake prompts (MFA fatigue), and SMS codes can be intercepted.', 'Judgement: highly effective for the cost, especially with app-based codes, though it should be combined with user education and lockouts.'], X(4))

T = 'Programming for the Web'
M(T, 'HTTP status code 404 means', 'the requested resource was not found', ['the request succeeded', 'a server error occurred', 'the user is not authorised'], '200 = OK, 500 = server error.')
M(T, 'Which language styles the appearance of a web page?', 'CSS', ['HTML', 'SQL', 'Python'], 'HTML gives structure, JavaScript gives behaviour.')
M(T, 'HTTPS differs from HTTP because it', 'encrypts data between the browser and server using TLS', ['is faster', 'uses no server', 'only works for images'], 'It protects against eavesdropping.')
M(T, 'Client-side scripts run', 'in the user\'s browser', ['on the web server', 'in the database', 'on the DNS server'], 'e.g. JavaScript in the page.')
M(T, 'DNS is used to', 'translate domain names into IP addresses', ['encrypt web pages', 'store cookies', 'style web pages'], 'e.g. example.com → 93.184.216.34.')
M(T, 'A REST API typically uses which method to create a new resource?', 'POST', ['GET', 'DELETE', 'HEAD'], 'GET reads, PUT/PATCH update, DELETE removes.')
M(T, 'A cookie is', 'a small piece of data stored by the browser for a website', ['a type of virus', 'a server program', 'an image format'], 'Used for sessions and preferences.')
M(T, 'Progressive web apps can', 'work offline and be installed like native apps', ['only run on desktops', 'not use JavaScript', 'never be cached'], 'They use service workers.')
W(T, 2, 'Distinguish between client-side and server-side processing.', ['Client-side code (e.g. JavaScript) runs in the user\'s browser and handles the interface and quick validation.', 'Server-side code (e.g. Python with Flask) runs on the web server, accesses the database and must do the trusted processing and security checks.'], X(2))
W(T, 3, 'Explain what happens when a user types a URL into a browser and presses Enter.', ['The browser asks a DNS server for the IP address of the domain.', 'It opens a connection (TLS for HTTPS) to the server and sends an HTTP GET request.', 'The server returns a response (status code plus HTML), and the browser requests the CSS, JavaScript and images it references, then renders the page.'], X(3))

T = 'Software Automation'
M(T, 'Machine learning differs from traditional programming because', 'the model learns patterns from data instead of following hand-written rules', ['it never needs data', 'it always gives perfect answers', 'it cannot be used for prediction'], 'Rules are inferred from examples.')
M(T, 'Supervised learning uses', 'labelled training data', ['no data', 'only unlabelled data', 'random rewards only'], 'Each example has a known answer.')
M(T, 'Reinforcement learning trains an agent using', 'rewards and penalties for actions', ['labelled images', 'a fixed formula', 'only clustering'], 'e.g. game-playing AI.')
M(T, 'Linear regression is used to', 'predict a continuous value from input variables', ['sort a list', 'classify images into groups only', 'encrypt data'], 'It fits a line of best fit.')
M(T, 'Overfitting occurs when a model', 'performs well on training data but poorly on new data', ['performs poorly on all data', 'has too little training data to run', 'is too simple'], 'It memorises noise.')
M(T, 'Bias in machine learning systems often comes from', 'training data that is not representative', ['using Python', 'fast computers', 'too many test cases'], 'Unrepresentative data leads to unfair outcomes.')
M(T, 'A neural network learns by', 'adjusting weights to reduce error', ['deleting neurons', 'sorting its inputs', 'storing every example'], 'Backpropagation uses gradients of the error.')
M(T, 'Robotic process automation (RPA) is used to', 'automate repetitive rule-based computer tasks', ['build physical robots', 'design hardware chips', 'replace all programmers'], 'e.g. copying data between systems.')
W(T, 2, 'Distinguish between supervised and unsupervised learning, with an example of each.', ['Supervised learning trains on labelled data to predict a known output, e.g. classifying emails as spam or not.', 'Unsupervised learning finds patterns in unlabelled data, e.g. clustering customers into groups by buying behaviour.'], X(2))
W(T, 3, 'Explain how bias can occur in a machine learning system and how developers can reduce it.', ['If training data under-represents some groups or reflects past unfair decisions, the model learns those patterns.', 'The model then makes less accurate or unfair predictions for those groups, e.g. facial recognition performing worse for darker skin tones.', 'Developers can use diverse, representative data, test accuracy separately for different groups, and keep humans reviewing high-stakes decisions.'], X(3))

T = 'Software Engineering Project'
M(T, 'The Agile approach to development', 'delivers working software in short iterations with frequent feedback', ['completes each stage fully before the next', 'never involves the client', 'has no testing'], 'e.g. Scrum sprints.')
M(T, 'The Waterfall approach', 'completes each stage in sequence before moving on', ['repeats short sprints', 'skips documentation', 'has no requirements stage'], 'Suited to stable, well-defined requirements.')
M(T, 'A Gantt chart is used to', 'schedule tasks over time', ['test code', 'model data', 'design user interfaces'], 'It shows task durations and dependencies.')
M(T, 'Functional requirements describe', 'what the system must do', ['how fast it must be', 'what it must look like only', 'the budget'], 'Non-functional requirements cover speed, security, usability.')
M(T, 'A data dictionary describes', 'each data item\'s name, type, size and validation', ['the program\'s user manual', 'the project timeline', 'the test results'], 'Used in design and coding.')
M(T, 'Version control (e.g. Git) lets developers', 'track changes and work together on the same code', ['run code faster', 'remove all bugs', 'design databases'], 'Commits record history; branches allow parallel work.')
W(T, 2, 'Compare the Agile and Waterfall approaches to software development.', ['Both aim to deliver a system that meets the client\'s requirements and include planning, building and testing.', 'Waterfall completes each stage once in order, so changes are costly; Agile works in short iterations with frequent client feedback, so it adapts to changing requirements.'], X(2))
W(T, 3, 'Explain why testing should happen throughout development rather than only at the end.', ['Errors found early (e.g. in unit tests as modules are written) are cheaper and quicker to fix than after integration.', 'Continuous testing confirms each part meets its requirements before other parts depend on it.', 'It reduces the risk of major rework near the deadline and improves final quality and client confidence.'], X(3))

b.save()
