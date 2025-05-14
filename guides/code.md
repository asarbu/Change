# Coding guidelines

## Event handlers

### Naming

#### Recommended Action verbs

Use **change** verb when you replace/swap one object with another
Use **edit** verb when you when you alter the state of the same object

Use **on<actionVerb><objectName>** when creating a subscribe method
Use **on<actionVerb>ed<objectName>** when handling an action
**Example:**
1. `onChangeStatement(handler)` for declaring a function that takes a handler for the event of changing a statement (subscribes to the event of changing a statement)
2. `onChangedStatement(statement)` for declaring a function that handles the behaviour of the app when the statement is changed with the provided value