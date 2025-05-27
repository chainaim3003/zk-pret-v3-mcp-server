import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

export interface ToolHandler {
  name: string;
  handler: (args: any) => Promise<any>;
  tool: Tool;
}

export class ToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();
  private categories: Map<string, string[]> = new Map();

  registerTool(tool: Tool, handler: (args: any) => Promise<any>): void {
    const toolHandler: ToolHandler = {
      name: tool.name,
      handler,
      tool
    };

    this.tools.set(tool.name, toolHandler);
    
    // Categorize tool
    const category = this.extractCategory(tool.name);
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(tool.name);

    logger.debug(`Registered tool: ${tool.name}`, { category });
  }

  registerTools(tools: Array<{ tool: Tool; handler: (args: any) => Promise<any> }>): void {
    for (const { tool, handler } of tools) {
      this.registerTool(tool, handler);
    }
  }

  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map(handler => handler.tool);
  }

  getToolsByCategory(category: string): Tool[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames
      .map(name => this.tools.get(name))
      .filter(handler => handler !== undefined)
      .map(handler => handler!.tool);
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getToolCount(): number {
    return this.tools.size;
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  removeTool(name: string): boolean {
    const handler = this.tools.get(name);
    if (!handler) return false;

    this.tools.delete(name);
    
    // Remove from category
    const category = this.extractCategory(name);
    const categoryTools = this.categories.get(category);
    if (categoryTools) {
      const index = categoryTools.indexOf(name);
      if (index > -1) {
        categoryTools.splice(index, 1);
        if (categoryTools.length === 0) {
          this.categories.delete(category);
        }
      }
    }

    logger.debug(`Removed tool: ${name}`);
    return true;
  }

  clear(): void {
    this.tools.clear();
    this.categories.clear();
    logger.debug('Cleared all tools from registry');
  }

  private extractCategory(toolName: string): string {
    // Extract category from tool name (e.g., "contract_deploy" -> "contract")
    const parts = toolName.split('_');
    return parts[0] || 'general';
  }

  // Get tool statistics
  getStatistics(): {
    totalTools: number;
    categories: Array<{ name: string; count: number }>;
    toolsByCategory: Record<string, string[]>;
  } {
    const categoriesWithCounts = Array.from(this.categories.entries()).map(([name, tools]) => ({
      name,
      count: tools.length
    }));

    const toolsByCategory = Object.fromEntries(
      Array.from(this.categories.entries())
    );

    return {
      totalTools: this.tools.size,
      categories: categoriesWithCounts,
      toolsByCategory
    };
  }

  // Validate tool registration
  validateTool(tool: Tool): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!tool.name || typeof tool.name !== 'string') {
      errors.push('Tool name must be a non-empty string');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      errors.push('Tool description must be a non-empty string');
    }

    if (tool.name && this.tools.has(tool.name)) {
      errors.push(`Tool with name '${tool.name}' already exists`);
    }

    if (tool.inputSchema && typeof tool.inputSchema !== 'object') {
      errors.push('Tool inputSchema must be a valid JSON schema object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Search tools by name or description
  searchTools(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values())
      .filter(handler => 
        handler.tool.name.toLowerCase().includes(lowerQuery) ||
        handler.tool.description.toLowerCase().includes(lowerQuery)
      )
      .map(handler => handler.tool);
  }

  // Get tools with specific input schema properties
  getToolsWithInputProperty(propertyName: string): Tool[] {
    return Array.from(this.tools.values())
      .filter(handler => {
        const schema = handler.tool.inputSchema;
        return schema && 
               typeof schema === 'object' && 
               'properties' in schema &&
               schema.properties &&
               propertyName in schema.properties;
      })
      .map(handler => handler.tool);
  }

  // Export tool definitions for external use
  exportToolDefinitions(): Array<{
    name: string;
    description: string;
    category: string;
    inputSchema?: any;
  }> {
    return Array.from(this.tools.values()).map(handler => ({
      name: handler.tool.name,
      description: handler.tool.description,
      category: this.extractCategory(handler.tool.name),
      inputSchema: handler.tool.inputSchema
    }));
  }

  // Import tool definitions (for configuration)
  importToolDefinitions(definitions: Array<{
    name: string;
    description: string;
    inputSchema?: any;
  }>): { imported: number; errors: Array<{ tool: string; error: string }> } {
    let imported = 0;
    const errors: Array<{ tool: string; error: string }> = [];

    for (const def of definitions) {
      try {
        const tool: Tool = {
          name: def.name,
          description: def.description,
          inputSchema: def.inputSchema
        };

        const validation = this.validateTool(tool);
        if (!validation.valid) {
          errors.push({
            tool: def.name,
            error: validation.errors.join('; ')
          });
          continue;
        }

        // Note: This would require actual handlers to be provided separately
        // This is mainly for validation and metadata purposes
        imported++;

      } catch (error) {
        errors.push({
          tool: def.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { imported, errors };
  }
}