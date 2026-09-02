use std::{
    fs::{self, File},
    io::{Seek, SeekFrom, Write},
    path::{Path, PathBuf},
};

const SAMPLE_RATE: u32 = 16_000;
const CHANNELS: u16 = 1;
const BITS_PER_SAMPLE: u16 = 16;

pub struct AudioSession {
    pub course_id: i64,
    pub path: PathBuf,
    file: File,
    samples_written: u32,
}

impl AudioSession {
    pub fn start(root: &Path, course_id: i64) -> Result<Self, String> {
        fs::create_dir_all(root).map_err(|e| e.to_string())?;
        let path = root.join(format!("course-{course_id}.wav"));
        let mut file = File::create(&path).map_err(|e| e.to_string())?;
        write_header(&mut file, 0)?;
        file.flush().map_err(|e| e.to_string())?;
        Ok(Self {
            course_id,
            path,
            file,
            samples_written: 0,
        })
    }

    pub fn append(&mut self, samples: &[i16]) -> Result<(), String> {
        self.file
            .seek(SeekFrom::End(0))
            .map_err(|e| e.to_string())?;
        let mut bytes = Vec::with_capacity(samples.len() * 2);
        for sample in samples {
            bytes.extend_from_slice(&sample.to_le_bytes());
        }
        self.file.write_all(&bytes).map_err(|e| e.to_string())?;
        self.samples_written = self.samples_written.saturating_add(samples.len() as u32);
        self.file
            .seek(SeekFrom::Start(0))
            .map_err(|e| e.to_string())?;
        write_header(&mut self.file, self.samples_written * 2)?;
        self.file
            .seek(SeekFrom::End(0))
            .map_err(|e| e.to_string())?;
        self.file.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn finish(self) -> Result<PathBuf, String> {
        self.file.sync_all().map_err(|e| e.to_string())?;
        Ok(self.path)
    }

    pub fn duration_ms(&self) -> i64 {
        i64::from(self.samples_written) * 1_000 / i64::from(SAMPLE_RATE)
    }
}

fn write_header(file: &mut File, data_size: u32) -> Result<(), String> {
    let byte_rate = SAMPLE_RATE * CHANNELS as u32 * BITS_PER_SAMPLE as u32 / 8;
    let block_align = CHANNELS * BITS_PER_SAMPLE / 8;
    file.write_all(b"RIFF").map_err(|e| e.to_string())?;
    file.write_all(&(36u32.saturating_add(data_size)).to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(b"WAVEfmt ").map_err(|e| e.to_string())?;
    file.write_all(&16u32.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&1u16.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&CHANNELS.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&SAMPLE_RATE.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&byte_rate.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&block_align.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(&BITS_PER_SAMPLE.to_le_bytes())
        .map_err(|e| e.to_string())?;
    file.write_all(b"data").map_err(|e| e.to_string())?;
    file.write_all(&data_size.to_le_bytes())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wav_is_playable_after_each_chunk() {
        let directory =
            std::env::temp_dir().join(format!("acourssur-audio-test-{}", std::process::id()));
        let mut session = AudioSession::start(&directory, 42).expect("recording starts");
        session
            .append(&vec![0; SAMPLE_RATE as usize])
            .expect("chunk appended");
        let path = session.finish().expect("recording finishes");
        let bytes = std::fs::read(&path).expect("wav readable");
        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(&bytes[8..12], b"WAVE");
        assert_eq!(bytes.len(), 44 + SAMPLE_RATE as usize * 2);
        std::fs::remove_file(path).expect("test wav removed");
        std::fs::remove_dir(directory).expect("test directory removed");
    }
}
