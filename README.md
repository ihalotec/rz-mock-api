# CastleMock Lite - User Guide

CastleMock Lite is a browser-based REST API mocking platform with a Scalar-inspired UI. It allows developers to mock API endpoints, simulate network latency, and define complex conditional responses without setting up a backend server.

---

## 🚀 Getting Started

1. **Create a Project**: On the dashboard, click **"New Project"**. Give it a name (e.g., "Auth Service") and a description.
2. **Enter the Project**: Click on the project card to enter the workspace.

---

## ⚡ Managing Endpoints

### 1. Adding Endpoints Manually
If you are building an API from scratch:
1. Click the **"+"** icon next to "Collections" in the sidebar.
2. Fill in the details:
   - **Name**: A friendly name (e.g., "Get User Profile").
   - **Method**: HTTP Verb (GET, POST, PUT, etc.).
   - **Path**: The URL path (e.g., `/api/v1/users`).
3. Click **Create**.

### 2. Importing Swagger / OpenAPI
If you have an existing specification:
1. Click the **Upload Icon** (⬆️) in the sidebar header.
2. **File Upload**: Select a `.json` OpenAPI/Swagger file from your computer.
3. **URL Import**: Paste a URL to a raw JSON spec. 
   - *Note*: If the server has CORS enabled, the app will try to fetch directly. If CORS fails, it attempts to fetch via a proxy (`api.allorigins.win`).

---

## 🛠 Configuring Mock Responses

An endpoint can have multiple responses (e.g., 200 OK, 400 Bad Request, 500 Server Error). You control which one is returned using the **Response Strategy**.

### Response Strategies

| Strategy | Description |
| :--- | :--- |
| **Default (Fixed)** | Always returns the response marked as "Default". |
| **Random** | Randomly selects one of the configured responses. |
| **Match Request** | Inspects the request body to decide which response to return based on logic. |

### Creating a Response
1. Select an Endpoint from the sidebar.
2. Switch to the **Mock Configuration** tab.
3. Click the **"+"** icon in the "Mock Responses" sidebar.
4. Configure:
   - **Name**: Internal identifier (e.g., "Invalid Password Error").
   - **Status Code**: HTTP status (e.g., 401).
   - **Body**: The JSON payload to return.
   - **Headers**: Custom response headers.
   - **Latency**: Simulate network delay (Fixed or Random range).

---

## 🧠 Conditional Matching (Data Schemas)

When using the **Match Request (Conditional)** strategy, you can define specific rules for triggering a response.

### 1. JSON Path (`key == value`)
Matches specific fields within the JSON request body. Supports dot notation for nested objects and array indexing.

*   **Syntax**: `path operator value`
*   **Operators**: `==` (Equals), `!=` (Not Equals), or leave empty to check for existence.

**Examples:**
| Expression | Matches Request |
| :--- | :--- |
| `role == 'admin'` | `{"role": "admin"}` |
| `user.isActive == true` | `{"user": {"isActive": true}}` |
| `items[0].id == 101` | `{"items": [{"id": 101}]}` |
| `errorCount != 0` | `{"errorCount": 5}` |
| `token` | `{"token": "..."}` (Checks if `token` exists and is not null) |

### 2. JSON Body Subset
Performs a deep partial match. The request body must contain *at least* the fields and values defined in your condition.

**Example Condition:**
```json
{
  "type": "login",
  "payload": {
    "rememberMe": true
  }
}
```
**Matches:** `{"type": "login", "payload": { "rememberMe": true, "device": "mobile" }}`  
**Does NOT Match:** `{"type": "login"}` (Missing nested field)

### 3. Regex Body Match
Matches the raw string representation of the request body against a Regular Expression.

**Example:** `^Error.*Critical$`

---

## 💡 Example Scenario: Login Flow

Here is how to set up a complete Login simulation with success and error states.

**Endpoint**: `POST /api/auth/login`

### Step 1: Success Response (Default)
*   **Name**: "200 Success"
*   **Status**: 200
*   **Body**:
    ```json
    {
      "token": "ey12345...",
      "user": { "id": 1, "name": "John Doe" }
    }
    ```
*   **Set as Default**: Click the Flag icon.

### Step 2: Invalid Password (Conditional)
We want to return a 401 if the password is "wrong_pass".

1.  Create a new response named "401 Invalid Pass".
2.  Set **Status Code** to `401`.
3.  Set **Strategy** to `Match Request (Conditional)`.
4.  **Condition Type**: `JSON Path`.
5.  **Expression**: `password == 'wrong_pass'`.
6.  **Body**:
    ```json
    { "error": "Invalid credentials" }
    ```

### Step 3: Locked Account (Conditional - Subset)
We want to return a 403 if the user specifically sends a "forced_lock" flag.

1.  Create a new response named "403 Locked".
2.  Set **Status Code** to `403`.
3.  **Condition Type**: `JSON Body Subset`.
4.  **Expression**:
    ```json
    {
      "options": { "forceLock": true }
    }
    ```
5.  **Body**: `{ "error": "Account is locked" }`

### Step 4: Testing
1.  Open the **Test Console** (Floating window at bottom).
2.  Set URL to `/api/auth/login`.
3.  **Test Success**:
    - Body: `{ "email": "admin@test.com", "password": "any" }`
    - Result: **200 OK**
4.  **Test Invalid Password**:
    - Body: `{ "email": "admin@test.com", "password": "wrong_pass" }`
    - Result: **401 Unauthorized**
5.  **Test Locked**:
    - Body: `{ "password": "any", "options": { "forceLock": true } }`
    - Result: **403 Forbidden**
