import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Download, Copy, Trash2, History, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { databaseAPI } from '@/lib/database-api';
import { toast } from 'sonner';

interface SQLConsoleProps {
  nodeId: string;
}

interface QueryResult {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  fields?: any[];
  error?: string;
  query: string;
  timestamp: Date;
  executionTime?: number;
}

export function SQLConsole({ nodeId }: SQLConsoleProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);

  const exampleQueries = [
    {
      name: 'Select All',
      query: 'SELECT * FROM table_name LIMIT 10;',
    },
    {
      name: 'Create Table',
      query: `CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    },
    {
      name: 'Insert Data',
      query: `INSERT INTO users (email, name)
VALUES ('user@example.com', 'John Doe')
RETURNING *;`,
    },
    {
      name: 'Update Data',
      query: `UPDATE users
SET name = 'Jane Doe'
WHERE email = 'user@example.com'
RETURNING *;`,
    },
    {
      name: 'Join Tables',
      query: `SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';`,
    },
    {
      name: 'Aggregate',
      query: `SELECT
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as count
FROM users
GROUP BY day
ORDER BY day DESC;`,
    },
  ];

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    const startTime = performance.now();
    setLoading(true);

    try {
      const result = await databaseAPI.executeSQL(nodeId, query);
      const endTime = performance.now();

      const queryResult: QueryResult = {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields,
        query,
        timestamp: new Date(),
        executionTime: endTime - startTime,
      };

      setResults([queryResult, ...results].slice(0, 20));
      setCurrentResult(queryResult);
      toast.success(`Query executed successfully (${queryResult.rowCount} rows in ${queryResult.executionTime?.toFixed(2)}ms)`);
    } catch (error: any) {
      const queryResult: QueryResult = {
        success: false,
        error: error.message,
        query,
        timestamp: new Date(),
      };

      setResults([queryResult, ...results].slice(0, 20));
      setCurrentResult(queryResult);
      toast.error('Query failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query);
    toast.success('Query copied to clipboard');
  };

  const handleExportResults = () => {
    if (!currentResult?.rows) return;

    const csv = [
      currentResult.fields?.map(f => f.name).join(','),
      ...currentResult.rows.map(row =>
        currentResult.fields?.map(f => JSON.stringify(row[f.name] || '')).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results exported');
  };

  const handleLoadExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const handleLoadHistory = (result: QueryResult) => {
    setQuery(result.query);
    setCurrentResult(result);
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SQL Console</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              className="font-mono text-sm min-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleExecuteQuery();
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={handleExecuteQuery} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Execute (Ctrl+Enter)
              </Button>
              <Button variant="outline" onClick={handleCopyQuery}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                onClick={() => setQuery('')}
                disabled={!query}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            {currentResult?.success && (
              <Button variant="outline" onClick={handleExportResults}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="results" className="flex-1 flex flex-col min-h-0">
          <div className="border-b">
            <TabsList className="w-full justify-start rounded-none border-b-0 p-0">
              <TabsTrigger value="results" className="rounded-none">
                Results
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-none">
                History ({results.length})
              </TabsTrigger>
              <TabsTrigger value="examples" className="rounded-none">
                Examples
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="results" className="flex-1 min-h-0 m-0 p-4">
            {!currentResult ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Execute a query to see results</p>
              </div>
            ) : currentResult.success ? (
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm">
                      {currentResult.rowCount} rows returned in {currentResult.executionTime?.toFixed(2)}ms
                    </span>
                  </div>

                  {currentResult.rows && currentResult.rows.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {currentResult.fields?.map((field) => (
                            <TableHead key={field.name}>{field.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentResult.rows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {currentResult.fields?.map((field) => (
                              <TableCell key={field.name} className="font-mono text-xs">
                                {formatValue(row[field.name])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Query executed successfully but returned no rows
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Query Failed</span>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3">
                  <pre className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                    {currentResult.error}
                  </pre>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 m-0 p-4">
            <ScrollArea className="h-full">
              {results.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No query history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleLoadHistory(result)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {result.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {result.success && (
                            <Badge variant="secondary">
                              {result.rowCount} rows
                            </Badge>
                          )}
                        </div>
                        <pre className="text-xs font-mono bg-muted/50 p-2 rounded overflow-x-auto">
                          {result.query}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="examples" className="flex-1 min-h-0 m-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {exampleQueries.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleLoadExample(example.query)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="font-medium text-sm">{example.name}</div>
                      <pre className="text-xs font-mono bg-muted/50 p-2 rounded overflow-x-auto">
                        {example.query}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
