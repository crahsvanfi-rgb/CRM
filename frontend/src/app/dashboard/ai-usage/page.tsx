'use client';

import { apiPath } from '@/lib/api-url';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Brain, Coins, BarChart, Database } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AiUsagePage() {
  const [summary, setSummary] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState({
    inicio: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    fin: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const summaryRes = await fetch(apiPath(`/ai-usage/summary?fechaInicio=${dateRange.inicio}&fechaFin=${dateRange.fin}`));
      if (!summaryRes.ok) throw new Error('Error al cargar el resumen');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      const logsRes = await fetch(apiPath(`/ai-usage?fechaInicio=${dateRange.inicio}&fechaFin=${dateRange.fin}&limit=50`));
      if (!logsRes.ok) throw new Error('Error al cargar los registros');
      const logsData = await logsRes.json();
      setLogs(logsData.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleExportCSV = () => {
    if (!logs.length) return;
    
    const headers = ['Fecha', 'Agente', 'Modelo', 'Operación', 'Tokens (P+C)', 'Costo Total ($)'];
    const csvContent = [
      headers.join(','),
      ...logs.map(l => [
        format(new Date(l.fecha), 'yyyy-MM-dd HH:mm'),
        l.agente,
        l.modelo,
        l.tipoOperacion,
        `${l.promptTokens} + ${l.completionTokens}`,
        l.costoTotal
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ai_usage_${dateRange.inicio}_to_${dateRange.fin}.csv`;
    link.click();
  };

  if (loading && !summary) {
    return <div className="p-6 animate-pulse">Cargando métricas de IA...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control de Costos IA</h1>
          <p className="text-muted-foreground mt-1">Supervisa el consumo y costo de tokens de los modelos de inteligencia artificial.</p>
        </div>
        <div className="flex gap-2">
          <Input 
            type="date" 
            value={dateRange.inicio}
            onChange={(e) => setDateRange({ ...dateRange, inicio: e.target.value })}
          />
          <Input 
            type="date" 
            value={dateRange.fin}
            onChange={(e) => setDateRange({ ...dateRange, fin: e.target.value })}
          />
          <Button onClick={fetchData}>Filtrar</Button>
          <Button variant="outline" onClick={handleExportCSV}>Exportar CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Estimado</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(summary?.global?.costoTotal || 0).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">En el período seleccionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens de Entrada</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.global?.promptTokens || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Prompt tokens procesados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens de Salida</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.global?.completionTokens || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Completion tokens generados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">N° Operaciones</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.global?.operaciones || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Llamadas a la API</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consumo por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-right">Operaciones</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary?.byAgent?.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.agente}</TableCell>
                    <TableCell className="text-right">{item._count.id}</TableCell>
                    <TableCell className="text-right">{item._sum.totalTokens?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Number(item._sum.costoTotal).toFixed(4)}</TableCell>
                  </TableRow>
                ))}
                {!summary?.byAgent?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center">No hay datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consumo por Modelo</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Operaciones</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary?.byModel?.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.modelo}</TableCell>
                    <TableCell className="text-right">{item._count.id}</TableCell>
                    <TableCell className="text-right">{item._sum.totalTokens?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${Number(item._sum.costoTotal).toFixed(4)}</TableCell>
                  </TableRow>
                ))}
                {!summary?.byModel?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center">No hay datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead className="text-right">Tokens (In + Out)</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.fecha), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                  <TableCell>{log.agente}</TableCell>
                  <TableCell className="truncate max-w-[150px]" title={log.modelo}>{log.modelo}</TableCell>
                  <TableCell>{log.tipoOperacion}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {log.promptTokens} + {log.completionTokens} = <span className="text-foreground font-medium">{log.totalTokens}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">${Number(log.costoTotal).toFixed(4)}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No hay registros de IA en este período.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
