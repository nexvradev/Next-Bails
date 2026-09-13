export declare class ObjectRepository<T extends object> {
    constructor(entities?: Record<string, T>);
    entityMap: Map<string, T>;
    findById(id: string): T | undefined;
    findAll(): T[];
    upsertById(id: string, entity: T): Map<string, T>;
    deleteById(id: string): boolean;
    count(): number;
    toJSON(): T[];
}
