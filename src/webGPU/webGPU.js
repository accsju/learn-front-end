//1 Use Navigator.gpu or WorkerNavigator.gpu that if in worker.
//2 use GPU.requestAdapter() to access adapter.
//3 GPUAdapter.requestDevice() 

//レンダーパイプライン
async function renderPipeline() {
    if (!navigator.gpu) {
        throw Error("WebGPUに対応していません。");
    }
    console.log(navigator.gpu);
    const adapter = await navigator.gpu.requestAdapter();
    console.log(adapter);
    if (!adapter) {
        throw Error("WebGPUアダプターの要求に失敗しました。");
    }
    //パイプライン　-> レンダーパイプライン,コンピュートパイプライン
    const device = await adapter.requestDevice();
    const shaders = `
        struct VertexOut {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f
        };
        @vertex
        fn vertex_main(@location(0) position: vec4f,
                    @location(1)  color: vec4f) -> VertexOut
        {
            var output : VertexOut;
            output.position = position;
            output.color = color;
            return output;
        }
        @fragment 
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
        {
            return fragData.color;
        }
    `;
    const shaderModule = device.createShaderModule({
        code: shaders,
    });
    const canvas = document.querySelector("#gpuCanvas");
    const context = canvas.getContext("webgpu");
    
    context.configure({
        device: device, 
        format: navigator.gpu.getPreferredCanvasFormat(), 
        alphaMode: "premultiplied",
    });
    const vertices = new Float32Array([
        0.0, 0.6, 0, 1, 1, 0, 0, 1, -0.5, -0.6, 0, 1, 0, 1, 0, 1, 0.5, -0.6, 0, 1, 0, 0, 1, 1,
    ]);
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength, // 頂点を格納するのに十分な大きさにする
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

    const vertexBuffers = [
        {
            attributes: [
                {
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x4",
                },
                {
                    shaderLocation: 1,
                    offset: 16,
                    format: "float32x4",
                },
            ],
            arrayStride: 32,
            stepMode: "vertex",
        },
    ];
    const pipelineDescriptor = {
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: vertexBuffers,
        },
        fragment: { 
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [
                {
                    format: navigator.gpu.getPreferredCanvasFormat(), 
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
        },
        layout: "auto",
    };
    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);       
    
    const commandEncoder = device.createCommandEncoder();
    const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: clearColor,
                loadOp: "clear",
                storeOp: "store",
                view: context.getCurrentTexture().createView()
            }
        ]
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);     
    
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}
// renderPipeline();

//コンピュートパイプライン
async function computePipeline() {
    //グローバルのバッファーサイズを定義する。
    if (!navigator.gpu) {
        throw Error("WebGPUに対応していません。");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error("WebGPUアダプターの要求に失敗しました。");
    }
    //パイプライン　-> レンダーパイプライン,コンピュートパイプライン
    const device = await adapter.requestDevice();
    const BUFFER_SIZE = 1000;
    const BYTE_SIZE = BUFFER_SIZE * 4; // Float32Arrayなので4バイトずつ

    const shaders = `
        @group(0) @binding(0)
        var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(
            @builtin(global_invocation_id)
            global_id : vec3u,
        ) {
            // バッファーの範囲外にアクセスしないようにする
            if (global_id.x >= ${BUFFER_SIZE}) {
                return;
            }
            output[global_id.x] = f32(global_id.x) * 1000. + f32(local_id.x);
        }
    `;
    const shaderModule = device.createShaderModule({
        code: shaders,
    });
    const output = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const stagingBuffer = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                },
            },
        ],
    });
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: output,
                },
            },
        ],
    });
    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        }),
        compute: {
            module: shaderModule,
            entryPoint: "main",
        },
    });
   
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();

    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64));
    passEncoder.end();

    commandEncoder.copyBufferToBuffer(
        output,
        0, //コピー元のオフセット
        stagingBuffer,
        0, //コピー先のオフセット
        BUFFER_SIZE,
    );
    //コマンドバッファーの配列を実行用のコマンドキューに渡し、フレームを終える
    device.queue.submit([commandEncoder.finish()]);

    //JavaScriptに結果を読み戻すため、ステージングバッファーをマップする
    await stagingBuffer.mapAsync(
        GPUMapMode.READ,
        0,
        BUFFER_SIZE,
    );
    const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
    const data = copyArrayBuffer.slice();
    stagingBuffer.unmap();
    console.log(new Float32Array(data));
}
// computePipeline();

