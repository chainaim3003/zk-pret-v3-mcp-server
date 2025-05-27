
export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface ToolHandler {
  tool: ToolDefinition;
  handler: (args: any) => Promise<any>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();

  public register(handler: ToolHandler): void {
    this.tools.set(handler.tool.name, handler);
  }

  public unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  public get(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(handler => ({
      name: handler.tool.name,
      description: handler.tool.description || 'No description available', // Fix for TS2322
      category: handler.tool.category,
      inputSchema: handler.tool.inputSchema
    }));
  }

  public listByCategory(category: string): ToolDefinition[] {
    return this.list().filter(tool => tool.category === category);
  }

  public search(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(tool => {
      const description = tool.description || ''; // Fix for TS18048
      return (
        tool.name.toLowerCase().includes(lowerQuery) ||
        description.toLowerCase().includes(lowerQuery) ||
        tool.category.toLowerCase().includes(lowerQuery)
      );
    });
  }

  public async execute(name: string, args: any): Promise<any> {
    const handler = this.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      return await handler.handler(args);
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  }

  public getCategories(): string[] {
    const categories = new Set<string>();
    for (const handler of this.tools.values()) {
      categories.add(handler.tool.category);
    }
    return Array.from(categories).sort();
  }

  public getStats(): {
    totalTools: number;
    categoriesCount: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};
    
    for (const handler of this.tools.values()) {
      const category = handler.tool.category;
      categories[category] = (categories[category] || 0) + 1;
    }

    return {
      totalTools: this.tools.size,
      categoriesCount: Object.keys(categories).length,
      categories
    };
  }

  public clear(): void {
    this.tools.clear();
  }
}