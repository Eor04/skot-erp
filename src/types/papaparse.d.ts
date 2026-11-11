declare module 'papaparse' {
    type ParseResult<T> = { data: T[]; errors: Array<{ message: string; row?: number }> };
    const Papa: {
        parse<T>(input: string, config: { header: true; skipEmptyLines: true }): ParseResult<T>;
    };
    export default Papa;
}
