# Coding guidelines

## Event handlers

### Naming

#### General guide

Use camelCase when declaring variables and methods.
Use CamelCase when declaring classes.
Use snake_case when declaring IDs.

#### Recommended Action verbs

Use **change** verb when you replace/swap one object with another
Use **edit** verb when you when you alter the state of the same object
Use **insert** in methods name instead of **add** for clarity. You may use **add** in interface if it saves space.

Use **on<actionVerb><objectName>** when creating a subscribe method
Use **on<actionVerb>ed<objectName>** when handling an action
**Example:**
1. `onChangeStatement(handler)` for declaring a function that takes a handler for the event of changing a statement (subscribes to the event of changing a statement)
2. `onChangedStatement(statement)` for declaring a function that handles the behaviour of the app when the statement is changed with the provided value

Use **<actionVerb><objectName>** when exposing an event publicly
**Example**
1. `clickInsertStatement` for declaring a function that simulates a click on the **insert statement** button.