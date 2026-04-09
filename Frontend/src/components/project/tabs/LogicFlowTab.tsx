import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LogicFlowTab() {
  return (
    <Tabs defaultValue="business-logic" className="space-y-4">
      <TabsList className="bg-secondary/50">
        <TabsTrigger value="business-logic">Business logic</TabsTrigger>
        <TabsTrigger value="flow-charts">Flow charts</TabsTrigger>
      </TabsList>
      <TabsContent value="business-logic" className="min-h-[200px]" />
      <TabsContent value="flow-charts" className="min-h-[200px]" />
    </Tabs>
  );
}
