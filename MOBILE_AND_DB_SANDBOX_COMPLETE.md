# Mobile Simulator & Database Sandbox - Complete Implementation

System lengkap untuk mobile development dengan Expo dan database sandbox per user.

---

## 🎯 What's Been Implemented

### 1. Mobile Simulator (Expo)

✅ **Expo Project Management**
- Create isolated Expo projects
- Configure app.json, package.json
- Auto-setup React Native projects
- Session-based isolation

✅ **Development Server**
- Start Expo dev server
- Web preview
- iOS simulator support
- Android emulator support
- Live reload & hot reload

✅ **Device Testing**
- QR code generation
- Expo Go app integration
- LAN mode for local devices
- Tunnel mode for remote access (ngrok)

✅ **Build & Export**
- Build for iOS
- Build for Android
- Web export
- EAS Build integration
- Local build support

✅ **File Management**
- Write project files
- Component creation
- Asset management
- Multi-file support

✅ **Package Management**
- npm install
- yarn install
- pnpm install
- Dependency management

✅ **Logs & Monitoring**
- Session logs
- Metro bundler logs
- Error tracking
- Status monitoring

### 2. Database Sandbox

✅ **Schema Isolation**
- Unique schema per user
- Complete isolation
- Production-safe testing
- Auto-generated schema names

✅ **SQL Query Execution**
- Full SQL support (SELECT, INSERT, UPDATE, DELETE)
- DDL operations (CREATE, ALTER, DROP TABLE)
- Query validation
- Parameter binding
- Timeout protection

✅ **Table Management**
- Create tables with schema
- List all tables
- Describe table structure
- Drop tables
- Create indexes
- Define primary keys

✅ **Data Operations**
- Insert single records
- Batch insert
- Update data
- Delete data
- Complex queries
- JOIN operations

✅ **Production Cloning**
- Clone all tables
- Clone specific tables
- Read-only copy
- Safe testing
- No production impact

✅ **Sandbox Management**
- Create sandboxes
- List user sandboxes
- Extend timeout
- Reset sandbox
- Destroy sandbox
- Auto-cleanup

✅ **Statistics & Monitoring**
- Table count
- Row count
- Disk usage
- Session tracking

✅ **Security**
- Query validation
- Dangerous query blocking
- Schema isolation
- Permission management
- Timeout protection

---

## 📦 Files Created

### Backend Services

**Mobile Simulator:**
- `backend/src/services/mobileSimulator.ts` - Expo project management, dev server, builds

**Database Sandbox:**
- `backend/src/services/databaseSandbox.ts` - Schema management, query execution, isolation

### Backend Routes

**Mobile API:**
- `backend/src/routes/mobile.ts` - Complete REST API for mobile simulator

**Database Sandbox API:**
- `backend/src/routes/dbsandbox.ts` - Complete REST API for database sandbox

### Documentation

**Mobile Simulator:**
- `backend/MOBILE_SIMULATOR_DOCUMENTATION.md` - Complete API reference & examples

**Database Sandbox:**
- `backend/DATABASE_SANDBOX_DOCUMENTATION.md` - Complete API reference & examples

**Summary:**
- `MOBILE_AND_DB_SANDBOX_COMPLETE.md` - This file

---

## 🔌 API Endpoints

### Mobile Simulator API

Base: `http://localhost:3001/api/mobile`

**Session Management:**
```
POST   /api/mobile/sessions           - Create Expo session
GET    /api/mobile/sessions           - List sessions
GET    /api/mobile/sessions/:id       - Get session details
DELETE /api/mobile/sessions/:id       - Destroy session
```

**Project Files:**
```
POST   /api/mobile/sessions/:id/files - Write project files
```

**Dependencies:**
```
POST   /api/mobile/sessions/:id/install - Install packages
```

**Dev Server:**
```
POST   /api/mobile/sessions/:id/start - Start Expo server
POST   /api/mobile/sessions/:id/stop  - Stop Expo server
```

**Build & Export:**
```
POST   /api/mobile/sessions/:id/build  - Build for platform
POST   /api/mobile/sessions/:id/export - Export project
```

**Logs:**
```
GET    /api/mobile/sessions/:id/logs  - Get session logs
```

### Database Sandbox API

Base: `http://localhost:3001/api/dbsandbox`

**Sandbox Management:**
```
POST   /api/dbsandbox/sandboxes           - Create sandbox
GET    /api/dbsandbox/sandboxes           - List sandboxes
GET    /api/dbsandbox/sandboxes/:id       - Get sandbox details
DELETE /api/dbsandbox/sandboxes/:id       - Destroy sandbox
POST   /api/dbsandbox/sandboxes/:id/extend - Extend timeout
POST   /api/dbsandbox/sandboxes/:id/reset  - Reset sandbox
GET    /api/dbsandbox/sandboxes/:id/stats  - Get statistics
```

**Query Execution:**
```
POST   /api/dbsandbox/sandboxes/:id/query - Execute SQL query
```

**Table Management:**
```
POST   /api/dbsandbox/sandboxes/:id/tables          - Create table
GET    /api/dbsandbox/sandboxes/:id/tables          - List tables
GET    /api/dbsandbox/sandboxes/:id/tables/:name    - Describe table
DELETE /api/dbsandbox/sandboxes/:id/tables/:name    - Drop table
```

**Data Operations:**
```
POST   /api/dbsandbox/sandboxes/:id/tables/:name/data - Insert data
```

**Production Cloning:**
```
POST   /api/dbsandbox/sandboxes/:id/clone - Clone from production
```

---

## 💻 Complete Usage Examples

### Mobile Simulator: Create React Native App

```typescript
// 1. Create Expo session
const { session } = await fetch('/api/mobile/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'mobile_app_456',
    config: {
      name: 'My Shopping App',
      slug: 'my-shopping-app',
      version: '1.0.0',
      platforms: ['ios', 'android', 'web'],
      orientation: 'portrait'
    }
  })
}).then(r => r.json());

const mobileSessionId = session.id;

// 2. Write React Native components
await fetch(`/api/mobile/sessions/${mobileSessionId}/files`, {
  method: 'POST',
  body: JSON.stringify({
    files: [
      {
        path: 'App.tsx',
        content: `
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ProductScreen from './screens/ProductScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Product" component={ProductScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
        `
      },
      {
        path: 'screens/HomeScreen.tsx',
        content: `
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const products = [
  { id: '1', name: 'iPhone 15', price: 999 },
  { id: '2', name: 'Samsung S24', price: 899 },
  { id: '3', name: 'Pixel 8', price: 699 },
];

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.product}
            onPress={() => navigation.navigate('Product', { product: item })}
          >
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>$\{item.price}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  product: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productName: { fontSize: 18 },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
});
        `
      },
      {
        path: 'screens/ProductScreen.tsx',
        content: `
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function ProductScreen({ route, navigation }) {
  const { product } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>$\{product.price}</Text>
      <Button title="Add to Cart" onPress={() => alert('Added!')} />
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  name: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  price: { fontSize: 24, color: '#007AFF', marginBottom: 20 },
});
        `
      }
    ]
  })
});

// 3. Install dependencies
await fetch(`/api/mobile/sessions/${mobileSessionId}/install`, {
  method: 'POST',
  body: JSON.stringify({ packageManager: 'npm' })
});

// 4. Start dev server with tunnel
const { server } = await fetch(
  `/api/mobile/sessions/${mobileSessionId}/start`,
  {
    method: 'POST',
    body: JSON.stringify({
      platform: 'web',
      tunnel: true,
      lan: true
    })
  }
).then(r => r.json());

console.log('Web Preview:', server.serverUrl);
console.log('QR Code (scan with Expo Go):', server.qrCode);
console.log('Public URL:', server.tunnelUrl);

// 5. View logs
const { logs } = await fetch(
  `/api/mobile/sessions/${mobileSessionId}/logs`
).then(r => r.json());

console.log('Recent logs:', logs);

// 6. Build for production
await fetch(`/api/mobile/sessions/${mobileSessionId}/build`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'android',
    profile: 'production',
    local: false
  })
});

// 7. Export web version
const { outputDir } = await fetch(
  `/api/mobile/sessions/${mobileSessionId}/export`,
  {
    method: 'POST',
    body: JSON.stringify({ platform: 'web' })
  }
).then(r => r.json());

console.log('Web build output:', outputDir);
```

### Database Sandbox: Test Schema Migration

```typescript
// 1. Create database sandbox
const { sandbox } = await fetch('/api/dbsandbox/sandboxes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'ecommerce_456'
  })
}).then(r => r.json());

const dbSandboxId = sandbox.id;
console.log('Database schema:', sandbox.schemaName);

// 2. Clone production tables
const { result: cloneResult } = await fetch(
  `/api/dbsandbox/sandboxes/${dbSandboxId}/clone`,
  {
    method: 'POST',
    body: JSON.stringify({
      schema: 'public',
      tables: ['users', 'products', 'orders']
    })
  }
).then(r => r.json());

console.log('Cloned tables:', cloneResult.cloned);

// 3. Test adding new column
await fetch(`/api/dbsandbox/sandboxes/${dbSandboxId}/query`, {
  method: 'POST',
  body: JSON.stringify({
    query: `
      ALTER TABLE users
      ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN phone_number VARCHAR(20),
      ADD COLUMN last_login TIMESTAMP;
    `
  })
});

// 4. Test data migration
await fetch(`/api/dbsandbox/sandboxes/${dbSandboxId}/query`, {
  method: 'POST',
  body: JSON.stringify({
    query: `
      UPDATE users
      SET email_verified = TRUE
      WHERE email IS NOT NULL
      AND created_at < NOW() - INTERVAL '30 days';
    `
  })
});

// 5. Verify migration results
const { result: verifyResult } = await fetch(
  `/api/dbsandbox/sandboxes/${dbSandboxId}/query`,
  {
    method: 'POST',
    body: JSON.stringify({
      query: `
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
          COUNT(CASE WHEN phone_number IS NOT NULL THEN 1 END) as with_phone
        FROM users;
      `
    })
  }
).then(r => r.json());

console.log('Migration results:', verifyResult.data[0]);

// 6. Test complex query
const { result: analyticsResult } = await fetch(
  `/api/dbsandbox/sandboxes/${dbSandboxId}/query`,
  {
    method: 'POST',
    body: JSON.stringify({
      query: `
        SELECT
          u.id,
          u.name,
          u.email,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_spent,
          MAX(o.created_at) as last_order_date
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE u.email_verified = TRUE
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(o.id) > 5
        ORDER BY total_spent DESC
        LIMIT 10;
      `
    })
  }
).then(r => r.json());

console.log('Top customers:', analyticsResult.data);

// 7. Create new test table
await fetch(`/api/dbsandbox/sandboxes/${dbSandboxId}/tables`, {
  method: 'POST',
  body: JSON.stringify({
    table: {
      name: 'product_reviews',
      columns: [
        { name: 'id', type: 'SERIAL', nullable: false },
        { name: 'product_id', type: 'INTEGER', nullable: false },
        { name: 'user_id', type: 'INTEGER', nullable: false },
        { name: 'rating', type: 'INTEGER', nullable: false },
        { name: 'comment', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id'],
      indexes: [
        { name: 'idx_product_reviews_product', columns: ['product_id'], unique: false },
        { name: 'idx_product_reviews_user', columns: ['user_id'], unique: false }
      ]
    }
  })
});

// 8. Insert test data
await fetch(
  `/api/dbsandbox/sandboxes/${dbSandboxId}/tables/product_reviews/data`,
  {
    method: 'POST',
    body: JSON.stringify({
      data: [
        { product_id: 1, user_id: 1, rating: 5, comment: 'Great product!' },
        { product_id: 1, user_id: 2, rating: 4, comment: 'Good quality' },
        { product_id: 2, user_id: 1, rating: 3, comment: 'Average' }
      ]
    })
  }
);

// 9. Get sandbox statistics
const { stats } = await fetch(
  `/api/dbsandbox/sandboxes/${dbSandboxId}/stats`
).then(r => r.json());

console.log('Sandbox stats:', {
  tables: stats.tables,
  rows: stats.totalRows,
  sizeMB: (stats.sizeBytes / 1024 / 1024).toFixed(2)
});

// 10. List all tables
const { tables } = await fetch(
  `/api/dbsandbox/sandboxes/${dbSandboxId}/tables`
).then(r => r.json());

console.log('All tables:', tables);

// 11. Describe table structure
const { table } = await fetch(
  `/api/dbsandbox/sandboxes/${dbSandboxId}/tables/product_reviews`
).then(r => r.json());

console.log('Table structure:', table);

// 12. If satisfied, apply to production
// If not satisfied, just destroy sandbox
await fetch(`/api/dbsandbox/sandboxes/${dbSandboxId}`, {
  method: 'DELETE'
});
```

### Combined: Mobile App + Database

```typescript
// Complete workflow: Mobile app with database backend

// 1. Create database sandbox
const { sandbox: dbSandbox } = await fetch('/api/dbsandbox/sandboxes', {
  method: 'POST',
  body: JSON.stringify({ userId: 'user_123', projectId: 'todo_app' })
}).then(r => r.json());

// 2. Setup database schema
await fetch(`/api/dbsandbox/sandboxes/${dbSandbox.id}/tables`, {
  method: 'POST',
  body: JSON.stringify({
    table: {
      name: 'todos',
      columns: [
        { name: 'id', type: 'SERIAL', nullable: false },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'completed', type: 'BOOLEAN', nullable: false, default: 'FALSE' },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id']
    }
  })
});

// 3. Insert test data
await fetch(
  `/api/dbsandbox/sandboxes/${dbSandbox.id}/tables/todos/data`,
  {
    method: 'POST',
    body: JSON.stringify({
      data: [
        { title: 'Learn React Native', completed: false },
        { title: 'Build mobile app', completed: false },
        { title: 'Deploy to stores', completed: false }
      ]
    })
  }
);

// 4. Create mobile session
const { session: mobileSession } = await fetch('/api/mobile/sessions', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user_123',
    projectId: 'todo_app',
    config: {
      name: 'Todo App',
      slug: 'todo-app',
      version: '1.0.0'
    }
  })
}).then(r => r.json());

// 5. Write mobile app that connects to database
await fetch(`/api/mobile/sessions/${mobileSession.id}/files`, {
  method: 'POST',
  body: JSON.stringify({
    files: [
      {
        path: 'App.tsx',
        content: `
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, TextInput, StyleSheet } from 'react-native';

const DB_SANDBOX_ID = '${dbSandbox.id}';
const API_URL = 'http://localhost:3001/api/dbsandbox';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');

  const fetchTodos = async () => {
    const response = await fetch(\`\${API_URL}/sandboxes/\${DB_SANDBOX_ID}/query\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'SELECT * FROM todos ORDER BY created_at DESC'
      })
    });
    const { result } = await response.json();
    setTodos(result.data);
  };

  const addTodo = async () => {
    await fetch(\`\${API_URL}/sandboxes/\${DB_SANDBOX_ID}/tables/todos/data\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { title: newTodo, completed: false }
      })
    });
    setNewTodo('');
    fetchTodos();
  };

  const toggleTodo = async (id: number) => {
    await fetch(\`\${API_URL}/sandboxes/\${DB_SANDBOX_ID}/query\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: \`UPDATE todos SET completed = NOT completed WHERE id = \${id}\`
      })
    });
    fetchTodos();
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Todos</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newTodo}
          onChangeText={setNewTodo}
          placeholder="Enter new todo"
        />
        <Button title="Add" onPress={addTodo} />
      </View>
      <FlatList
        data={todos}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.todo}
            onPress={() => toggleTodo(item.id)}
          >
            <Text style={[
              styles.todoText,
              item.completed && styles.completed
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  inputContainer: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, marginRight: 10 },
  todo: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  todoText: { fontSize: 16 },
  completed: { textDecorationLine: 'line-through', color: '#999' },
});
        `
      }
    ]
  })
});

// 6. Start mobile dev server
const { server } = await fetch(
  `/api/mobile/sessions/${mobileSession.id}/start`,
  {
    method: 'POST',
    body: JSON.stringify({ platform: 'web' })
  }
).then(r => r.json());

console.log('Mobile app running:', server.serverUrl);
console.log('Database schema:', dbSandbox.schemaName);
console.log('QR Code for device:', server.qrCode);
```

---

## 🔒 Security Summary

### Mobile Simulator
- ✅ Isolated workspaces
- ✅ Port allocation
- ✅ Session timeout (1 hour)
- ✅ Auto-cleanup
- ✅ Max 50 concurrent sessions

### Database Sandbox
- ✅ Schema isolation
- ✅ Query validation
- ✅ Dangerous query blocking
- ✅ Production safety
- ✅ Session timeout (1 hour)
- ✅ Max 100 concurrent sandboxes
- ✅ Auto-cleanup

---

## 📊 Statistics

### Mobile Simulator
- Sessions created
- Dev servers running
- Builds completed
- Exports generated

### Database Sandbox
- Sandboxes active
- Queries executed
- Tables created
- Data cloned

---

## ✅ What's Working

### Mobile Simulator
- ✅ Expo session creation
- ✅ Project file writing
- ✅ Dependency installation
- ✅ Dev server startup
- ✅ QR code generation
- ✅ Tunnel support
- ✅ Platform builds
- ✅ Web export
- ✅ Session logs
- ✅ Auto-cleanup

### Database Sandbox
- ✅ Schema creation
- ✅ Query execution
- ✅ Table management
- ✅ Data operations
- ✅ Production cloning
- ✅ Query validation
- ✅ Statistics
- ✅ Auto-cleanup

---

## 🎉 Summary

Implementation lengkap dari:

**Mobile Simulator:**
- ✅ Expo project management
- ✅ Live development server
- ✅ QR code device testing
- ✅ Multi-platform support (Web/iOS/Android)
- ✅ Build & export
- ✅ Tunnel for remote access

**Database Sandbox:**
- ✅ Isolated database per user
- ✅ Full SQL support
- ✅ Production cloning (safe)
- ✅ Table CRUD operations
- ✅ Query validation
- ✅ Auto-cleanup

**User sekarang bisa:**
1. 📱 Develop mobile apps dengan Expo
2. 🧪 Test di browser atau device
3. 🎨 Live reload saat coding
4. 🗄️ Test database queries safely
5. 📊 Clone production untuk testing
6. 🔒 Complete isolation & security

**Production-ready mobile development & database testing environment!** 🚀
