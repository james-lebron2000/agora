interface StemSeparationResult {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
    piano?: string;
}
/**
 * MixMaster Agent - AI Audio Mixing Engine
 * Powered by Demucs (Stem Separation) + ffmpeg (Mixing)
 */
export declare class MixMaster {
    private tempDir;
    constructor();
    /**
     * Separate audio into stems using Demucs
     */
    separateStems(inputPath: string): Promise<StemSeparationResult>;
    /**
     * Auto-mix two tracks with AI-selected transition
     */
    autoMix(track1Path: string, track2Path: string): Promise<string>;
    /**
     * Smart mastering - adjust loudness and EQ
     */
    smartMaster(inputPath: string): Promise<string>;
    /**
     * Get audio info (duration, bitrate, etc.)
     */
    getAudioInfo(inputPath: string): Promise<any>;
}
export declare const mixMaster: MixMaster;
export default MixMaster;
//# sourceMappingURL=mixmaster.d.ts.map